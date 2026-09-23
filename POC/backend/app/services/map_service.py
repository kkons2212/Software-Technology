import math
from typing import List, Dict, Any, Optional
from app.repositories.poi_repository import POIRepository

class MapService:
    @staticmethod
    def get_map_markers(floor: Optional[int] = None) -> List[Dict[str, Any]]:
        """Lấy danh sách toạ độ các hiện vật trên bản đồ theo tầng."""
        pois = POIRepository.get_all_pois()
        markers = []
        for p in pois:
            if floor is None or p.get("floor") == floor:
                markers.append({
                    "id": p["id"],
                    "title": p["title_vi"],
                    "short_description": p.get("short_description_vi") or (p["description_vi"][:140] if p.get("description_vi") else ""),
                    "x_coord": p["x_coord"],
                    "y_coord": p["y_coord"],
                    "floor": p["floor"],
                    "image_url": p["image_url"],
                })
        return markers

    @staticmethod
    def get_route_recommendation(current_poi_id: Optional[int] = None, floor: int = 1) -> Dict[str, Any]:
        """
        Tính toán lộ trình và đề xuất hiện vật tiếp theo cho khách tham quan (UC-02).
        Thuật toán:
        - Nếu có current_poi_id: Tìm POI kế tiếp gần nhất cùng tầng chưa ghé qua hoặc theo ID tăng dần.
        - Nếu không có (khách vào từ cổng): Lấy POI đầu tiên ở tầng 1 làm điểm khởi đầu.
        """
        all_pois = POIRepository.get_all_pois()
        floor_pois = [p for p in all_pois if p.get("floor") == floor]
        
        current_poi = None
        if current_poi_id:
            current_poi = next((p for p in all_pois if p["id"] == current_poi_id), None)

        next_poi = None
        if current_poi and floor_pois:
            # Tìm POI có khoảng cách Euclid gần nhất khác current_poi trên cùng tầng
            candidates = [p for p in floor_pois if p["id"] != current_poi["id"]]
            if candidates:
                def distance(p):
                    dx = p["x_coord"] - current_poi["x_coord"]
                    dy = p["y_coord"] - current_poi["y_coord"]
                    return math.sqrt(dx*dx + dy*dy)
                
                candidates.sort(key=distance)
                next_poi = candidates[0]
        elif floor_pois:
            next_poi = floor_pois[0]

        # Chuẩn bị dữ liệu trả về
        return {
            "current_poi": {
                "id": current_poi["id"],
                "title": current_poi["title_vi"],
                "short_description": current_poi.get("short_description_vi") or (current_poi["description_vi"][:140] if current_poi.get("description_vi") else ""),
                "x_coord": current_poi["x_coord"],
                "y_coord": current_poi["y_coord"],
                "floor": current_poi["floor"],
                "image_url": current_poi["image_url"]
            } if current_poi else None,
            "next_poi": {
                "id": next_poi["id"],
                "title": next_poi["title_vi"],
                "short_description": next_poi.get("short_description_vi") or (next_poi["description_vi"][:140] if next_poi.get("description_vi") else ""),
                "x_coord": next_poi["x_coord"],
                "y_coord": next_poi["y_coord"],
                "floor": next_poi["floor"],
                "image_url": next_poi["image_url"]
            } if next_poi else None,
            "all_markers": [
                {
                    "id": p["id"],
                    "title": p["title_vi"],
                    "short_description": p.get("short_description_vi") or (p["description_vi"][:140] if p.get("description_vi") else ""),
                    "x_coord": p["x_coord"],
                    "y_coord": p["y_coord"],
                    "floor": p["floor"],
                    "image_url": p["image_url"]
                }
                for p in floor_pois
            ]
        }
