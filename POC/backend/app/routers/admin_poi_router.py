from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks, status
from typing import Optional, List
from app.services.poi_service import POIService
from app.schemas.poi_schema import POIResponse

router = APIRouter(prefix="/api/admin/pois", tags=["Admin POI Management (UC-04)"])

@router.get("", response_model=List[POIResponse])
def get_all_pois():
    """Lấy danh sách tất cả hiện vật / POI trong bảo tàng kèm trạng thái dịch và audio."""
    return POIService.get_all_pois()

@router.get("/{poi_id}", response_model=POIResponse)
def get_poi_by_id(poi_id: int):
    """Lấy thông tin chi tiết một POI kèm danh sách bản dịch và audio đầy đủ."""
    poi = POIService.get_poi_by_id(poi_id)
    if not poi:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy POI với ID này.")
    return poi

@router.post("", response_model=POIResponse, status_code=status.HTTP_201_CREATED)
async def create_poi(
    background_tasks: BackgroundTasks,
    title_vi: str = Form(..., description="Tiêu đề tiếng Việt của hiện vật"),
    description_vi: str = Form(..., description="Mô tả chi tiết tiếng Việt"),
    short_description_vi: Optional[str] = Form(None, description="Mô tả tóm tắt tiếng Việt"),
    x_coord: float = Form(0.0, description="Toạ độ X trên bản đồ (0 - 1000)"),
    y_coord: float = Form(0.0, description="Toạ độ Y trên bản đồ (0 - 1000)"),
    floor: int = Form(1, description="Tầng hiển thị"),
    image: Optional[UploadFile] = File(None, description="Hình ảnh hiện vật")
):
    """
    Tạo mới một hiện vật / POI (UC-04).
    Tự động sinh mã QR (UC-05) và kích hoạt tiến trình dịch (UC-08) + sinh audio (UC-09) ngầm.
    """
    if not title_vi.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tiêu đề không được để trống.")
    if not description_vi.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Mô tả không được để trống.")
        
    poi = await POIService.create_poi(
        title_vi=title_vi.strip(),
        description_vi=description_vi.strip(),
        short_description_vi=short_description_vi.strip() if short_description_vi else None,
        x_coord=x_coord,
        y_coord=y_coord,
        floor=floor,
        image_file=image,
        background_tasks=background_tasks
    )
    return poi

@router.put("/{poi_id}", response_model=POIResponse)
async def update_poi(
    poi_id: int,
    background_tasks: BackgroundTasks,
    title_vi: Optional[str] = Form(None),
    short_description_vi: Optional[str] = Form(None),
    description_vi: Optional[str] = Form(None),
    x_coord: Optional[float] = Form(None),
    y_coord: Optional[float] = Form(None),
    floor: Optional[int] = Form(None),
    image: Optional[UploadFile] = File(None)
):
    """Cập nhật thông tin hiện vật / POI và tự động sinh lại bản dịch + audio (UC-04 A1)."""
    poi = await POIService.update_poi(
        poi_id=poi_id,
        title_vi=title_vi.strip() if title_vi else None,
        short_description_vi=short_description_vi.strip() if short_description_vi else None,
        description_vi=description_vi.strip() if description_vi else None,
        x_coord=x_coord,
        y_coord=y_coord,
        floor=floor,
        image_file=image,
        background_tasks=background_tasks
    )
    if not poi:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy POI để cập nhật.")
    return poi

@router.post("/{poi_id}/reprocess-ai")
def reprocess_ai_pipeline(poi_id: int, background_tasks: BackgroundTasks):
    """Kích hoạt thủ công chuỗi AI dịch đa ngôn ngữ và tạo file audio cho POI."""
    success = POIService.trigger_reprocess_ai(poi_id, background_tasks)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy POI.")
    return {
        "poi_id": poi_id,
        "status": "INITIATED",
        "message": "Đã bắt đầu tiến trình dịch thuật và sinh giọng đọc AI ngầm."
    }

@router.delete("/{poi_id}", status_code=status.HTTP_200_OK)
def delete_poi(poi_id: int):
    """Xoá hiện vật / POI và dọn dẹp các tệp tin liên quan (UC-04 Alternative Path A2)."""
    success = POIService.delete_poi(poi_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy POI để xoá.")
    return {"message": f"Đã xoá thành công POI #{poi_id}."}
