import os
import shutil
import uuid
from pathlib import Path
from typing import Optional, List, Dict, Any
from fastapi import UploadFile, BackgroundTasks

from config import IMAGE_DIR, AUDIO_DIR, QR_DIR
from app.repositories.poi_repository import POIRepository
from app.services.qr_service import QRService
from app.services.pipeline_coordinator import PipelineCoordinator

class POIService:
    @staticmethod
    async def save_image_file(image_file: UploadFile) -> str:
        """Lưu file ảnh tải lên vào thư mục static/images/ và trả về relative URL."""
        if not image_file or not image_file.filename:
            return None
        
        file_ext = Path(image_file.filename).suffix.lower()
        if file_ext not in [".jpg", ".jpeg", ".png", ".webp", ".svg"]:
            file_ext = ".jpg"
            
        unique_filename = f"poi_{uuid.uuid4().hex[:8]}{file_ext}"
        destination = IMAGE_DIR / unique_filename
        
        with open(destination, "wb") as buffer:
            shutil.copyfileobj(image_file.file, buffer)
            
        return f"/static/images/{unique_filename}"

    @staticmethod
    def get_all_pois() -> List[Dict[str, Any]]:
        """Lấy danh sách tất cả POI."""
        return POIRepository.get_all_pois()

    @staticmethod
    def get_poi_by_id(poi_id: int) -> Optional[Dict[str, Any]]:
        """Lấy thông tin chi tiết một POI."""
        return POIRepository.get_poi_by_id(poi_id)

    @staticmethod
    async def create_poi(
        title_vi: str,
        description_vi: str,
        short_description_vi: Optional[str] = None,
        x_coord: float = 0.0,
        y_coord: float = 0.0,
        floor: int = 1,
        image_file: Optional[UploadFile] = None,
        background_tasks: Optional[BackgroundTasks] = None
    ) -> Dict[str, Any]:
        """
        Tạo mới hiện vật / POI (UC-04).
        Tự động sinh mã QR (UC-05) và kích hoạt Background Tasks (UC-08, UC-09).
        """
        image_url = None
        if image_file:
            image_url = await POIService.save_image_file(image_file)
            
        final_short = short_description_vi
        if not final_short or not final_short.strip():
            final_short = description_vi.split(".")[0].strip() + "." if "." in description_vi else description_vi[:140]

        poi_id = POIRepository.create_poi(
            title_vi=title_vi,
            short_description_vi=final_short,
            description_vi=description_vi,
            image_url=image_url,
            x_coord=x_coord,
            y_coord=y_coord,
            floor=floor
        )
        
        # Tự động sinh mã QR cho POI mới (UC-05)
        QRService.generate_qr_code(poi_id)
        
        # Lưu bản dịch tiếng Việt gốc vào bảng translations
        POIRepository.upsert_translation(
            poi_id=poi_id,
            language_code="vi",
            title=title_vi,
            short_description=final_short,
            description=description_vi,
            status="COMPLETED"
        )
        
        # Kích hoạt chuỗi xử lý nền: Dịch (UC-08) -> Sinh Audio TTS (UC-09)
        if background_tasks:
            background_tasks.add_task(
                PipelineCoordinator.process_poi_pipeline,
                poi_id=poi_id,
                title_vi=title_vi,
                description_vi=description_vi,
                short_description_vi=final_short
            )
        
        return POIRepository.get_poi_by_id(poi_id)

    @staticmethod
    async def update_poi(
        poi_id: int,
        title_vi: Optional[str] = None,
        short_description_vi: Optional[str] = None,
        description_vi: Optional[str] = None,
        x_coord: Optional[float] = None,
        y_coord: Optional[float] = None,
        floor: Optional[int] = None,
        image_file: Optional[UploadFile] = None,
        background_tasks: Optional[BackgroundTasks] = None
    ) -> Optional[Dict[str, Any]]:
        """Cập nhật thông tin POI hiện có và kích hoạt lại pipeline AI nếu nội dung thay đổi."""
        existing = POIRepository.get_poi_by_id(poi_id)
        if not existing:
            return None
            
        image_url = None
        if image_file:
            image_url = await POIService.save_image_file(image_file)
            
        POIRepository.update_poi(
            poi_id=poi_id,
            title_vi=title_vi,
            short_description_vi=short_description_vi,
            description_vi=description_vi,
            image_url=image_url,
            x_coord=x_coord,
            y_coord=y_coord,
            floor=floor
        )
        
        # Nếu có thay đổi tiêu đề hoặc mô tả, cập nhật bản dịch tiếng Việt và chạy lại AI ngầm
        final_title = title_vi or existing["title_vi"]
        final_desc = description_vi or existing["description_vi"]
        final_short = short_description_vi if short_description_vi is not None else existing.get("short_description_vi")
        if not final_short or not final_short.strip():
            final_short = final_desc.split(".")[0].strip() + "." if "." in final_desc else final_desc[:140]
        
        if title_vi or description_vi or short_description_vi is not None:
            POIRepository.upsert_translation(
                poi_id=poi_id,
                language_code="vi",
                title=final_title,
                short_description=final_short,
                description=final_desc,
                status="COMPLETED"
            )
            
            if background_tasks:
                background_tasks.add_task(
                    PipelineCoordinator.process_poi_pipeline,
                    poi_id=poi_id,
                    title_vi=final_title,
                    description_vi=final_desc,
                    short_description_vi=final_short
                )
            
        return POIRepository.get_poi_by_id(poi_id)

    @staticmethod
    def trigger_reprocess_ai(poi_id: int, background_tasks: BackgroundTasks) -> bool:
        """Kích hoạt chạy lại toàn bộ quy trình dịch và sinh audio ngầm cho một POI."""
        poi = POIRepository.get_poi_by_id(poi_id)
        if not poi:
            return False
            
        background_tasks.add_task(
            PipelineCoordinator.process_poi_pipeline,
            poi_id=poi_id,
            title_vi=poi["title_vi"],
            description_vi=poi["description_vi"],
            short_description_vi=poi.get("short_description_vi")
        )
        return True

    @staticmethod
    def delete_poi(poi_id: int) -> bool:
        """Xoá POI và dọn dẹp các tệp tin tĩnh liên quan."""
        poi = POIRepository.get_poi_by_id(poi_id)
        if not poi:
            return False
            
        # Dọn dẹp file QR code
        qr_file = QR_DIR / f"qr_poi_{poi_id}.png"
        if qr_file.exists():
            try:
                os.remove(qr_file)
            except Exception:
                pass
                
        # Dọn dẹp file audio .mp3
        if "audios" in poi:
            for audio in poi["audios"]:
                url = audio.get("audio_url", "")
                if url:
                    file_name = Path(url).name
                    audio_file = AUDIO_DIR / file_name
                    if audio_file.exists():
                        try:
                            os.remove(audio_file)
                        except Exception:
                            pass
                            
        return POIRepository.delete_poi(poi_id)
