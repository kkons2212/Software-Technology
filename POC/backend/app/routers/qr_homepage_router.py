"""
Router phục vụ sinh mã QR trang chủ để khách quét truy cập website.
Tận dụng thư viện qrcode đã có trong QRService.
"""
import io
import base64
import qrcode
from fastapi import APIRouter
from fastapi.responses import JSONResponse

from config import get_frontend_base_url

router = APIRouter(prefix="/api/qr", tags=["QR Homepage"])


@router.get("/homepage")
def generate_homepage_qr():
    """
    Sinh mã QR chứa link trang chủ (homepage) của website.
    Trả về ảnh QR dưới dạng base64 data URI để frontend hiển thị mà không
    phụ thuộc vào static file serving (hoạt động qua Cloudflare tunnel).
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

    # Tạo ảnh QR sắc nét và encode sang base64
    qr_image = qr.make_image(fill_color="#0f172a", back_color="#ffffff").convert("RGB")

    buffer = io.BytesIO()
    qr_image.save(buffer, format="PNG")
    buffer.seek(0)
    b64 = base64.b64encode(buffer.read()).decode("utf-8")
    data_uri = f"data:image/png;base64,{b64}"

    return JSONResponse(content={
        "qr_image_url": data_uri,
        "target_url": homepage_url,
        "message": "Quét mã QR này để truy cập trang chủ Smart Museum"
    })

