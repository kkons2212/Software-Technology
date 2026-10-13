"""
Router phục vụ sinh mã QR trang chủ để khách quét truy cập website.
Tận dụng thư viện qrcode đã có trong QRService.
"""
import qrcode
from PIL import Image
from fastapi import APIRouter
from fastapi.responses import JSONResponse

from config import QR_DIR, get_frontend_base_url

router = APIRouter(prefix="/api/qr", tags=["QR Homepage"])


@router.get("/homepage")
def generate_homepage_qr():
    """
    Sinh mã QR chứa link trang chủ (homepage) của website.
    Trả về URL ảnh QR để frontend hiển thị.
    """
    base_url = get_frontend_base_url().rstrip("/")
    homepage_url = base_url  # QR dẫn thẳng về trang chủ "/"

    print(f"[QR Homepage] Sinh mã QR cho trang chủ: {homepage_url}")

    # Cấu hình QR Code chất lượng cao
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=12,
        border=3,
    )
    qr.add_data(homepage_url)
    qr.make(fit=True)

    # Tạo ảnh QR sắc nét
    qr_image = qr.make_image(fill_color="#0f172a", back_color="#ffffff").convert("RGB")

    # Lưu file
    file_name = "qr_homepage.png"
    file_path = QR_DIR / file_name
    qr_image.save(str(file_path), format="PNG")

    relative_url = f"/static/qr/{file_name}"

    return JSONResponse(content={
        "qr_image_url": relative_url,
        "target_url": homepage_url,
        "message": "Quét mã QR này để truy cập trang chủ Smart Museum"
    })
