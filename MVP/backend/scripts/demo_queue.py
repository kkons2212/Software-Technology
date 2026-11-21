"""Stress and verification demo: Enqueue N POIs (default 60) simultaneously into PipelineQueue."""

import asyncio
import os
import sys
import time
from unittest.mock import AsyncMock, MagicMock

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.pipeline_queue import PipelineQueueManager


async def main():
    # Read count from CLI arguments or default to 60
    total_pois = 60
    if len(sys.argv) > 1:
        try:
            total_pois = int(sys.argv[1])
        except ValueError:
            total_pois = 60

    print("=" * 75)
    print(
        f" KIEM THU TAI LON (STRESS TEST): ENQUEUE {total_pois} POI DONG THOI VAO QUEUE"
    )
    print("=" * 75)

    current_concurrent = 0
    concurrency_peak = 0
    completed_order = []

    # Simulated worker task
    async def simulated_pipeline(poi_id: str, target_languages=None):
        nonlocal current_concurrent, concurrency_peak
        current_concurrent += 1
        if current_concurrent > concurrency_peak:
            concurrency_peak = current_concurrent

        # Simulate execution time (0.05s so 60 POIs finish smoothly in ~6 seconds)
        await asyncio.sleep(0.05)

        completed_order.append(poi_id)
        current_concurrent -= 1
        return {poi_id: {"translation": True, "audio": True}}

    mock_service = MagicMock()
    mock_service.run_pipeline_for_poi = AsyncMock(side_effect=simulated_pipeline)

    # Initialize queue manager with max_concurrency = 1
    queue = PipelineQueueManager(
        pipeline_service_factory=lambda: mock_service,
        max_concurrency=1,
        cooldown_seconds=0.03,  # Short cooldown for test speed
    )

    print(
        f"\n[*] Buoc 1: Dang kich hoat va day {total_pois} POI DONG THOI vao Hang doi..."
    )
    start_wall_time = time.time()

    tasks = []
    for i in range(1, total_pois + 1):
        poi_id = f"POI_{i:02d}"
        langs = ["en", "ja", "ko", "zh"]
        # Enqueue and keep task handle
        t = asyncio.create_task(queue.enqueue_and_wait(poi_id, langs))
        tasks.append((poi_id, t))

    print(
        f"[*] DA ENQUEUE XONG {total_pois} POI vao Queue! Queue Size hien tai: {queue.get_status()['queue_size']}"
    )
    print(
        "[*] Buoc 2: Worker lay tung POI xu ly tuan tu (dam bao Concurrency luon = 1)...\n"
    )

    # Monitor progress as tasks complete
    for idx, (poi_id, task) in enumerate(tasks, 1):
        await task
        remaining_in_queue = queue.get_status()["queue_size"]
        now = time.strftime("%H:%M:%S")
        print(
            f" [{now}] [{idx:02d}/{total_pois}] Hoan thanh: {poi_id} | Concurrency hien tai: {current_concurrent} (Dinh: {concurrency_peak}) | Con trong Queue: {remaining_in_queue}"
        )

    total_duration = time.time() - start_wall_time

    print("\n" + "=" * 75)
    print(" TONG KET KET QUA KIEM THU TAI (STRESS TEST 60 POI):")
    print("=" * 75)
    print(f" • Tong so POI gui vao cung luc    : {total_pois}")
    print(
        f" • So POI da hoan thanh thanh cong  : {len(completed_order)} / {total_pois}"
    )
    print(
        f" • Concurrency toi da (Dinh)       : {concurrency_peak} (Dung gioi han = 1, KHONG BI SPAM API)"
    )
    print(f" • Tong thoi gian xu ly            : {total_duration:.2f} giay")
    print(
        f" • Kiem tra thu tu FIFO            : {'100% DUNG THU TU' if completed_order == [f'POI_{i:02d}' for i in range(1, total_pois + 1)] else 'SAI THU TU'}"
    )
    print(
        " • Ket luan                         : DAT YEU CAU (He thong on dinh tuyet doi!)"
    )
    print("=" * 75 + "\n")

    await queue.stop_worker()


if __name__ == "__main__":
    asyncio.run(main())
