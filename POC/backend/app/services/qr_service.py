import qrcode
from PIL import Image
import os
from pathlib import Path
from config import QR_DIR, get_frontend_base_url
from app.repositories.poi_repository import POIRepository

class QRService:
    @staticmethod
    def generate_qr_code(poi_id: int, base_url: str = None) -> str:
        """
        Sinh mã QR code cho POI (UC-05).
        Mã QR chứa link trực tiếp tới trang chi tiết hiện vật: {base_url}/poi/{poi_id}
        """
        target_base = base_url or get_frontend_base_url()
        poi_url = f"{target_base.rstrip('/')}/poi/{poi_id}"
        print(f"[QRService] Sinh ma QR cho POI #{poi_id} voi URL dich: {poi_url}")
        
        # Cấu hình QR Code chất lượng cao
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_H,
            box_size=10,
            border=3,
        )
        qr.add_data(poi_url)
        qr.make(fit=True)
        
        # Tạo ảnh QR với màu sắc tương phản sắc nét
        qr_image = qr.make_image(fill_color="#0f172a", back_color="#ffffff").convert("RGB")
        
        # Lưu file vào thư mục static/qr/
        file_name = f"qr_poi_{poi_id}.png"
        file_path = QR_DIR / file_name
        qr_image.save(str(file_path), format="PNG")
        
        # Cập nhật đường dẫn vào CSDL
        relative_url = f"/static/qr/{file_name}"
        POIRepository.update_qr_code_url(poi_id, relative_url)
        
        return relative_url

    @staticmethod
    def get_qr_file_path(poi_id: int) -> Path:
        """Lấy đường dẫn tệp tin mã QR trên đĩa cứng để phục vụ download."""
        file_name = f"qr_poi_{poi_id}.png"
        file_path = QR_DIR / file_name
        if not file_path.exists():
            # Tự động sinh lại nếu file chưa tồn tại
            QRService.generate_qr_code(poi_id)
        return file_path
