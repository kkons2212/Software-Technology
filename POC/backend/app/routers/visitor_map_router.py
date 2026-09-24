from fastapi import APIRouter, Query
from typing import Optional, List, Dict, Any
from app.services.map_service import MapService

router = APIRouter(prefix="/api/visitor/map", tags=["Visitor Map & Routes (UC-02)"])

@router.get("/markers")
def get_map_markers(floor: Optional[int] = Query(None, description="Lọc theo tầng (1 hoặc 2)")):
    """Lấy danh sách tất cả các điểm đánh dấu hiện vật trên bản đồ (UC-02)."""
    return MapService.get_map_markers(floor)

@router.get("/recommend")
def get_route_recommendation(
    current_poi_id: Optional[int] = Query(None, description="ID của POI vừa quét mã QR gần nhất"),
    floor: int = Query(1, description="Tầng hiện tại"),
    visited_ids: Optional[str] = Query(None, description="Danh sách các ID POI đã nghe, phân cách bởi dấu phẩy")
):
    """
    Tính toán vị trí hiện tại và gợi ý lộ trình đến hiện vật tiếp theo (UC-02 Basic Flow & Alternative A1).
    """
    return MapService.get_route_recommendation(
        current_poi_id=current_poi_id,
        floor=floor,
        visited_ids=visited_ids
    )
