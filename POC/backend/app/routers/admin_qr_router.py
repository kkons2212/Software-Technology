from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import FileResponse
from typing import Optional
from app.services.qr_service import QRService
from app.repositories.poi_repository import POIRepository

router = APIRouter(prefix="/api/admin/pois", tags=["Admin QR Code Management (UC-05)"])

@router.post("/{poi_id}/qrcode")
def regenerate_qr_code(poi_id: int, base_url: Optional[str] = Query(None, description="Custom base URL (ví dụ: Cloudflare Tunnel URL)")):
    """Tái tạo mã QR code cho POI với tuỳ chọn URL tuỳ chỉnh (UC-05 Alternative Path A2)."""
    poi = POIRepository.get_poi_by_id(poi_id)
    if not poi:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy POI để sinh mã QR.")
        
    qr_url = QRService.generate_qr_code(poi_id, base_url=base_url)
    return {
        "poi_id": poi_id,
        "qr_code_url": qr_url,
        "message": "Đã tạo mới mã QR thành công."
    }

@router.get("/{poi_id}/qrcode/download")
def download_qr_code(poi_id: int):
    """Tải tệp ảnh mã QR .png của POI về máy (UC-05 Basic Course Step 8)."""
    poi = POIRepository.get_poi_by_id(poi_id)
    if not poi:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy POI để tải mã QR.")
        
    file_path = QRService.get_qr_file_path(poi_id)
    if not file_path.exists():
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Không thể tạo tệp ảnh mã QR.")
        
    return FileResponse(
        path=str(file_path),
        media_type="image/png",
        filename=f"QR_POI_{poi_id}_{poi['title_vi'][:20].replace(' ', '_')}.png"
    )
