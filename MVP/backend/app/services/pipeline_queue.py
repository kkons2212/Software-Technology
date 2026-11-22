"""Centralized asynchronous job queue and worker manager for POI translation pipelines (US 04.4).

Ensures serialized/bounded concurrent execution of translation and TTS pipelines,
preventing API rate-limit exhaustion (HTTP 429), out-of-order writes, and database connection spikes.
"""

from __future__ import annotations

import asyncio
import logging
import time
from collections.abc import Callable
from typing import TYPE_CHECKING, Any

from app.core.config import get_settings
from app.core.database import SessionLocal

if TYPE_CHECKING:
    from sqlalchemy.orm import Session

    from app.services.translation_pipeline_service import (
        TranslationPipelineService,
    )

logger = logging.getLogger(__name__)


class PipelineJob:
    """Represents a queued POI translation & TTS pipeline job."""

    def __init__(
        self,
        poi_id: str,
        target_languages: list[str] | None = None,
        future: asyncio.Future | None = None,
    ):
        self.poi_id = poi_id
        self.target_languages = (
            list(target_languages) if target_languages is not None else None
        )
        self.future: asyncio.Future = (
            future if future is not None else asyncio.get_running_loop().create_future()
        )
        self.is_running: bool = False
        self.enqueued_at: float = time.time()


class PipelineQueueManager:
    """Singleton queue and worker orchestrator regulating background pipeline executions."""

    def __init__(
        self,
        session_factory: Callable[[], Session] | None = None,
        pipeline_service_factory: (
            Callable[[], TranslationPipelineService] | None
        ) = None,
        max_concurrency: int | None = None,
        cooldown_seconds: float | None = None,
    ):
        settings = get_settings()
        self.session_factory = session_factory or SessionLocal
        self.pipeline_service_factory = (
            pipeline_service_factory or self._default_service_factory
        )
        self.max_concurrency = (
            max_concurrency
            if max_concurrency is not None
            else getattr(settings, "PIPELINE_MAX_CONCURRENCY", 1)
        )
        self.cooldown_seconds = (
            cooldown_seconds
            if cooldown_seconds is not None
            else getattr(settings, "PIPELINE_JOB_COOLDOWN_SECONDS", 1.5)
        )

        self._queue: asyncio.Queue[PipelineJob] | None = None
        self._pending_jobs: dict[str, PipelineJob] = {}
        self._semaphore: asyncio.Semaphore | None = None
        self._worker_task: asyncio.Task | None = None
        self._stopped: bool = False

    @staticmethod
    def _default_service_factory() -> TranslationPipelineService:
        from app.services.translation_pipeline_service import (
            TranslationPipelineService,
        )

        return TranslationPipelineService()

    def _get_queue(self) -> asyncio.Queue[PipelineJob]:
        if self._queue is None:
            self._queue = asyncio.Queue()
        return self._queue

    def _get_semaphore(self) -> asyncio.Semaphore:
        if self._semaphore is None:
            self._semaphore = asyncio.Semaphore(max(1, self.max_concurrency))
        return self._semaphore

    def _ensure_worker_started(self) -> None:
        """Lazily spawn the async worker loop if not already running."""
        if self._stopped:
            return
        if self._worker_task is None or self._worker_task.done():
            try:
                loop = asyncio.get_running_loop()
                self._worker_task = loop.create_task(self._worker_loop())
                logger.info(
                    "Pipeline queue worker loop started (concurrency: %d, cooldown: %.2fs)",
                    self.max_concurrency,
                    self.cooldown_seconds,
                )
            except RuntimeError:
                logger.warning(
                    "No active event loop found to start pipeline queue worker loop."
                )

    def enqueue(
        self,
        poi_id: str,
        target_languages: list[str] | None = None,
    ) -> PipelineJob:
        """Enqueue a POI translation pipeline job with deduplication."""
        existing_job = self._pending_jobs.get(poi_id)
        if existing_job is not None and not existing_job.is_running:
            if target_languages:
                current_langs = set(existing_job.target_languages or [])
                current_langs.update(target_languages)
                existing_job.target_languages = list(current_langs)
            logger.info(
                "POI %s already queued in pipeline queue; merged job targets: %s",
                poi_id,
                existing_job.target_languages,
            )
            self._ensure_worker_started()
            return existing_job

        queue = self._get_queue()
        job = PipelineJob(
            poi_id=poi_id,
            target_languages=target_languages,
        )
        self._pending_jobs[poi_id] = job
        queue.put_nowait(job)
        self._ensure_worker_started()

        logger.info(
            "Enqueued POI %s into pipeline queue (queue_size: %d, pending: %d)",
            poi_id,
            queue.qsize(),
            len(self._pending_jobs),
        )
        return job

    async def enqueue_and_wait(
        self,
        poi_id: str,
        target_languages: list[str] | None = None,
    ) -> dict[str, dict[str, bool]] | None:
        """Enqueue POI and await execution completion."""
        job = self.enqueue(poi_id, target_languages)
        return await job.future

    async def _worker_loop(self) -> None:
        """Continuous worker consuming jobs one at a time under bounded concurrency."""
        queue = self._get_queue()
        semaphore = self._get_semaphore()

        while not self._stopped:
            try:
                job = await queue.get()
            except asyncio.CancelledError:
                break
            except Exception as exc:
                logger.exception("Unexpected error waiting for next job: %s", exc)
                continue

            job.is_running = True
            try:
                async with semaphore:
                    try:
                        logger.info(
                            "Worker starting pipeline processing for POI %s (targets: %s)...",
                            job.poi_id,
                            job.target_languages,
                        )
                        pipeline_service = self.pipeline_service_factory()
                        results = await pipeline_service.run_pipeline_for_poi(
                            poi_id=job.poi_id,
                            target_languages=job.target_languages,
                        )
                        if not job.future.done():
                            job.future.set_result(results)
                        logger.info(
                            "Worker successfully finished pipeline processing for POI %s",
                            job.poi_id,
                        )
                    except Exception as exc:
                        logger.exception(
                            "Worker encountered error during pipeline processing for POI %s: %s",
                            job.poi_id,
                            exc,
                        )
                        if not job.future.done():
                            job.future.set_exception(exc)
                    finally:
                        self._pending_jobs.pop(job.poi_id, None)
                        queue.task_done()

                    if self.cooldown_seconds > 0 and not self._stopped:
                        logger.debug(
                            "Worker applying cooldown of %.2fs before next job",
                            self.cooldown_seconds,
                        )
                        await asyncio.sleep(self.cooldown_seconds)
            except Exception as exc:
                logger.debug("Worker loop cycle error: %s", exc)

    def recover_pending_translations(self) -> int:
        """Self-healing scan querying DB for PENDING translations and enqueuing them on startup (US 04.4)."""
        try:
            with self.session_factory() as db:
                from app.repositories.translation_repository import (
                    TranslationRepository,
                )

                repo = TranslationRepository(db)
                pending_map = repo.get_pending_poi_translations()
        except Exception as exc:
            logger.warning(
                "Could not recover pending translations from DB on startup: %s",
                exc,
            )
            return 0

        recovered_count = 0
        for poi_id, langs in pending_map.items():
            if poi_id not in self._pending_jobs:
                self.enqueue(poi_id, langs)
                recovered_count += 1

        if recovered_count > 0:
            logger.info(
                "Auto-recovery successfully enqueued %d pending POI translation jobs from database",
                recovered_count,
            )
        return recovered_count

    async def start_worker(self) -> None:
        """Explicitly start the worker loop task."""
        self._stopped = False
        self._ensure_worker_started()

    async def stop_worker(self, timeout: float = 1.0) -> None:
        """Gracefully shutdown the worker loop."""
        self._stopped = True
        if self._worker_task and not self._worker_task.done():
            self._worker_task.cancel()
            try:
                await asyncio.wait_for(self._worker_task, timeout=timeout)
            except (asyncio.CancelledError, asyncio.TimeoutError):
                pass
        self._worker_task = None
        self._queue = None
        self._semaphore = None
        logger.info("Pipeline queue worker stopped cleanly.")

    def get_status(self) -> dict[str, Any]:
        """Inspect queue telemetry for monitoring and health reporting."""
        queue_size = self._queue.qsize() if self._queue is not None else 0
        return {
            "queue_size": queue_size,
            "pending_count": len(self._pending_jobs),
            "pending_poi_ids": list(self._pending_jobs.keys()),
            "is_worker_running": self._worker_task is not None
            and not self._worker_task.done(),
            "max_concurrency": self.max_concurrency,
            "cooldown_seconds": self.cooldown_seconds,
        }


_global_pipeline_queue: PipelineQueueManager | None = None


def get_pipeline_queue() -> PipelineQueueManager:
    """Access the process-wide pipeline queue manager singleton."""
    global _global_pipeline_queue
    if _global_pipeline_queue is None:
        _global_pipeline_queue = PipelineQueueManager()
    return _global_pipeline_queue


def reset_pipeline_queue() -> None:
    """Reset the singleton instance (primarily for test isolation)."""
    global _global_pipeline_queue
    if _global_pipeline_queue is not None:
        try:
            if (
                _global_pipeline_queue._worker_task
                and not _global_pipeline_queue._worker_task.done()
            ):
                _global_pipeline_queue._worker_task.cancel()
        except Exception:
            pass
    _global_pipeline_queue = None
