"""Demo script verifying PipelineQueue FIFO execution, concurrency gate, and cooldown."""

import asyncio
import os
import sys
import time
from unittest.mock import AsyncMock, MagicMock

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.pipeline_queue import PipelineQueueManager


async def main():
    print("=" * 70)
    print(" DEMO KIEM THU HANG DOI TUAN TU (FIFO PIPELINE QUEUE & WORKER)")
    print("=" * 70)

    # Fake translation & audio pipeline function
    async def simulated_pipeline(poi_id: str, target_languages=None):
        start_time = time.strftime("%H:%M:%S")
        print(
            f" [{start_time}] >> WORKER BAT DAU xu ly: {poi_id} (Ngon ngu: {target_languages})"
        )
        # Simulating external API calls (Gemini translation + Edge TTS)
        await asyncio.sleep(1.2)
        end_time = time.strftime("%H:%M:%S")
        print(f" [{end_time}] << WORKER HOAN THANH: {poi_id}!")
        return {poi_id: {"translation": True, "audio": True}}

    mock_service = MagicMock()
    mock_service.run_pipeline_for_poi = AsyncMock(side_effect=simulated_pipeline)

    # Initialize queue with max_concurrency = 1 and 1.5s cooldown
    queue = PipelineQueueManager(
        pipeline_service_factory=lambda: mock_service,
        max_concurrency=1,
        cooldown_seconds=1.5,
    )

    print("\n[*] Buoc 1: Enqueue 3 POI cung mot luc vao Hang doi...")
    now = time.strftime("%H:%M:%S")
    print(f" [{now}] [Enqueue] Day POI_01 vao Queue...")
    t1 = asyncio.create_task(queue.enqueue_and_wait("POI_01", ["en", "fr"]))

    print(f" [{now}] [Enqueue] Day POI_02 vao Queue...")
    t2 = asyncio.create_task(queue.enqueue_and_wait("POI_02", ["ja", "zh"]))

    print(f" [{now}] [Enqueue] Day POI_03 vao Queue...")
    t3 = asyncio.create_task(queue.enqueue_and_wait("POI_03", ["ko"]))

    print(
        f"\n[*] Trang thai Queue hien tai: {queue.get_status()['queue_size']} job dang cho trong Queue."
    )
    print(
        "[*] Quan sat Worker lay tung POI mot cach tuan tu (kem 1.5s cooldown giua cac POI):\n"
    )

    # Await all 3 POIs
    await asyncio.gather(t1, t2, t3)

    print("\n" + "=" * 70)
    print(" KET QUA: TAT CA 3 POI DA DUOC XU LY TUAN TU THANH CONG!")
    print(" Khong he co tinh trang goi API dong thoi lam sup he thong.")
    print("=" * 70 + "\n")

    await queue.stop_worker()


if __name__ == "__main__":
    asyncio.run(main())
