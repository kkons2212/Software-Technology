import sys
import asyncio
sys.stdout.reconfigure(encoding='utf-8')

from app.services.pipeline_coordinator import PipelineCoordinator
from app.repositories.poi_repository import POIRepository

async def main():
    title = "Trống Đồng Đông Sơn"
    desc = "Trống đồng Đông Sơn là hiện vật tiêu biểu của nền văn hóa Đông Sơn thời kỳ đồ đồng tại Việt Nam, mang ý nghĩa lịch sử và nghệ thuật sâu sắc."
    
    POIRepository.update_poi(1, title_vi=title, description_vi=desc)
    await PipelineCoordinator.process_poi_pipeline(1, title, desc)
    
    poi = POIRepository.get_poi_by_id(1)
    print("\n=== KẾT QUẢ DỊCH ĐA NGÔN NGỮ (UC-08) ===")
    for t in poi.get("translations", []):
        print(f"[{t['language_code'].upper()}] Tiêu đề: {t['title']}")
        print(f"       Mô tả: {t['description']}")
        
    print("\n=== KẾT QUẢ FILE AUDIO EDGE-TTS (UC-09) ===")
    for a in poi.get("audios", []):
        print(f"[{a['language_code'].upper()}] Audio URL: {a['audio_url']} (Trạng thái: {a['status']})")

if __name__ == "__main__":
    asyncio.run(main())
