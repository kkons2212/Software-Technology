"""Unit tests for PipelineQueueManager and asynchronous job regulation (US 04.4).

Verifies FIFO execution order, bounded concurrency gate (max 1 concurrent POI),
job deduplication, auto-recovery on restart, and exception isolation.
"""

import asyncio
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.repositories.translation_repository import TranslationRepository
from app.services.pipeline_queue import (
    PipelineQueueManager,
    reset_pipeline_queue,
)
from app.services.translation_pipeline_service import (
    TranslationPipelineService,
    execute_poi_pipeline_background_task,
)


@pytest.fixture(autouse=True)
def cleanup_pipeline_queue():
    """Ensure a fresh queue manager for every test case."""
    reset_pipeline_queue()
    yield
    reset_pipeline_queue()


@pytest.mark.asyncio
async def test_pipeline_queue_fifo_ordering_and_concurrency_gate():
    """Verify that multiple enqueued POIs are executed in strict FIFO order under single concurrency."""
    execution_order = []
    concurrency_peak = 0
    current_concurrent = 0

    async def mock_run_pipeline(poi_id: str, target_languages=None):
        nonlocal current_concurrent, concurrency_peak
        current_concurrent += 1
        if current_concurrent > concurrency_peak:
            concurrency_peak = current_concurrent
        await asyncio.sleep(0.05)
        execution_order.append(poi_id)
        current_concurrent -= 1
        return {poi_id: {"translation": True, "audio": True}}

    mock_service = MagicMock(spec=TranslationPipelineService)
    mock_service.run_pipeline_for_poi = AsyncMock(side_effect=mock_run_pipeline)

    queue = PipelineQueueManager(
        pipeline_service_factory=lambda: mock_service,
        max_concurrency=1,
        cooldown_seconds=0.01,
    )

    t1 = asyncio.create_task(queue.enqueue_and_wait("POI_ALPHA", ["en"]))
    t2 = asyncio.create_task(queue.enqueue_and_wait("POI_BETA", ["ja"]))
    t3 = asyncio.create_task(queue.enqueue_and_wait("POI_GAMMA", ["ko"]))

    results = await asyncio.gather(t1, t2, t3)

    assert execution_order == ["POI_ALPHA", "POI_BETA", "POI_GAMMA"]
    assert concurrency_peak == 1
    assert len(results) == 3
    assert queue.get_status()["pending_count"] == 0

    await queue.stop_worker()


@pytest.mark.asyncio
async def test_pipeline_queue_deduplication_merges_target_languages():
    """Verify that submitting the same POI while pending merges targets instead of duplicating tasks."""
    mock_service = MagicMock(spec=TranslationPipelineService)
    # Slow task so job 2 arrives while job 1 is waiting
    mock_service.run_pipeline_for_poi = AsyncMock(return_value={"result": True})

    queue = PipelineQueueManager(
        pipeline_service_factory=lambda: mock_service,
        max_concurrency=1,
        cooldown_seconds=0.0,
    )

    # Enqueue first time
    job1 = queue.enqueue("POI_DUP", ["en", "ja"])
    # Enqueue second time before execution
    job2 = queue.enqueue("POI_DUP", ["ko", "zh"])

    assert job1 is job2
    assert set(job1.target_languages) == {"en", "ja", "ko", "zh"}
    assert queue.get_status()["queue_size"] == 1
    assert queue.get_status()["pending_count"] == 1

    await job1.future
    await queue.stop_worker()


@pytest.mark.asyncio
async def test_pipeline_queue_handles_exception_and_releases_lock():
    """Verify that an error in one job propagates to its caller and does not block subsequent jobs."""
    execution_order = []

    async def mock_run_pipeline(poi_id: str, target_languages=None):
        if poi_id == "POI_CRASH":
            raise RuntimeError("API Timeout / 429 Rate Limit")
        execution_order.append(poi_id)
        return {"success": True}

    mock_service = MagicMock(spec=TranslationPipelineService)
    mock_service.run_pipeline_for_poi = AsyncMock(side_effect=mock_run_pipeline)

    queue = PipelineQueueManager(
        pipeline_service_factory=lambda: mock_service,
        max_concurrency=1,
        cooldown_seconds=0.01,
    )

    job_fail = asyncio.create_task(queue.enqueue_and_wait("POI_CRASH"))
    job_ok = asyncio.create_task(queue.enqueue_and_wait("POI_RECOVER"))

    with pytest.raises(RuntimeError, match="API Timeout / 429 Rate Limit"):
        await job_fail

    result_ok = await job_ok
    assert result_ok == {"success": True}
    assert execution_order == ["POI_RECOVER"]
    assert queue.get_status()["pending_count"] == 0

    await queue.stop_worker()


@pytest.mark.asyncio
async def test_execute_poi_pipeline_background_task_delegates_to_queue(mocker):
    """Verify that the backward-compatible entry point routes execution through queue."""
    mock_service = mocker.MagicMock(spec=TranslationPipelineService)
    mock_service.run_pipeline_for_poi = AsyncMock(return_value={"vi": {"audio": True}})

    mocker.patch(
        "app.services.pipeline_queue.PipelineQueueManager._default_service_factory",
        return_value=mock_service,
    )

    # Calling the background task must route to queue and complete
    await execute_poi_pipeline_background_task("POI_ROUTED", ["en", "fr"])

    mock_service.run_pipeline_for_poi.assert_called_once_with(
        poi_id="POI_ROUTED", target_languages=["en", "fr"]
    )


@pytest.mark.asyncio
async def test_pipeline_queue_auto_recovery_from_database(mocker):
    """Verify that recover_pending_translations queries repository and enqueues unfinished jobs."""
    mock_db = MagicMock()
    mock_session_factory = MagicMock(
        return_value=MagicMock(
            __enter__=MagicMock(return_value=mock_db), __exit__=MagicMock()
        )
    )

    mock_repo = MagicMock(spec=TranslationRepository)
    mock_repo.get_pending_poi_translations.return_value = {
        "POI_RECOVER_1": ["en", "ja"],
        "POI_RECOVER_2": ["fr"],
    }

    mocker.patch(
        "app.repositories.translation_repository.TranslationRepository",
        return_value=mock_repo,
    )

    queue = PipelineQueueManager(
        session_factory=mock_session_factory,
        max_concurrency=1,
    )

    # Before recovery
    assert queue.get_status()["pending_count"] == 0

    # Auto-recovery scan
    count = queue.recover_pending_translations()

    assert count == 2
    status = queue.get_status()
    assert status["pending_count"] == 2
    assert "POI_RECOVER_1" in status["pending_poi_ids"]
    assert "POI_RECOVER_2" in status["pending_poi_ids"]

    await queue.stop_worker()


def test_pipeline_queue_status_reporting():
    """Verify get_status returns accurate configuration and telemetry."""
    queue = PipelineQueueManager(
        max_concurrency=2,
        cooldown_seconds=3.5,
    )
    status = queue.get_status()

    assert status["queue_size"] == 0
    assert status["pending_count"] == 0
    assert status["pending_poi_ids"] == []
    assert status["max_concurrency"] == 2
    assert status["cooldown_seconds"] == 3.5
    assert status["is_worker_running"] is False
