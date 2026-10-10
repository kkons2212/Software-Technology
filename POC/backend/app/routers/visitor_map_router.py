from fastapi import APIRouter, Query
from typing import Optional, List, Dict, Any
from app.services.map_service import MapService

router = APIRouter(prefix="/api/visitor/map", tags=["Visitor Map & Routes (UC-02)"])

@router.get("/markers")
def get_map_markers(floor: Optional[int] = Query(None, description="Lọc theo phân khu / tầng")):
    """Lấy danh sách tất cả các điểm đánh dấu GPS hiện vật ngoài trời (UC-02)."""
    return MapService.get_map_markers(floor)

@router.get("/recommend")
def get_route_recommendation(
    current_poi_id: Optional[int] = Query(None, description="ID của POI vừa tiếp cận gần nhất"),
    floor: Optional[int] = Query(None, description="Lọc phân khu nếu có"),
    visited_ids: Optional[str] = Query(None, description="Danh sách các ID POI đã nghe, phân cách bởi dấu phẩy"),
    user_lat: Optional[float] = Query(None, description="Vĩ độ GPS thời gian thực của khách"),
    user_lng: Optional[float] = Query(None, description="Kinh độ GPS thời gian thực của khách")
):
    """
    Tính toán lộ trình GPS và gợi ý hiện vật ngoài trời tiếp theo (UC-02).
    """
    return MapService.get_route_recommendation(
        current_poi_id=current_poi_id,
        floor=floor,
        visited_ids=visited_ids,
        user_lat=user_lat,
        user_lng=user_lng
    )
