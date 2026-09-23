import logging
from app.services.translation_service import TranslationService
from app.services.tts_service import TTSService

logger = logging.getLogger("PipelineCoordinator")
logger.setLevel(logging.INFO)

class PipelineCoordinator:
    @staticmethod
    async def process_poi_pipeline(poi_id: int, title_vi: str, description_vi: str, short_description_vi: str = None):
        """
        Chuỗi xử lý ngầm (FastAPI BackgroundTasks):
        Bước 1: UC-08 - Tự động dịch sang EN, JA, KO, ZH
        Bước 2: UC-09 - Tự động sinh file .mp3 giọng đọc cho từng ngôn ngữ & lưu Cache
        """
        try:
            logger.info(f"[PIPELINE START] Bắt đầu chuỗi xử lý AI nền cho POI #{poi_id}...")
            
            # 1. Dịch đa ngôn ngữ (UC-08)
            translated_contents = await TranslationService.process_poi_translations(
                poi_id=poi_id,
                title_vi=title_vi,
                description_vi=description_vi,
                short_description_vi=short_description_vi
            )
            
            # 2. Sinh và Cache Audio Files (UC-09)
            await TTSService.process_poi_audios(
                poi_id=poi_id,
                localized_contents=translated_contents
            )
            
            logger.info(f"[PIPELINE FINISHED] Hoàn tất toàn bộ chuỗi AI nền cho POI #{poi_id} thành công!")
        except Exception as e:
            logger.error(f"[PIPELINE ERROR] Xảy ra sự cố khi chạy chuỗi AI cho POI #{poi_id}: {e}", exc_info=True)
