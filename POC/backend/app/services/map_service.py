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
    def get_route_recommendation(
        current_poi_id: Optional[int] = None,
        floor: int = 1,
        visited_ids: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Tính toán lộ trình và đề xuất hiện vật tiếp theo cho khách tham quan (UC-02).
        Thuật toán:
        - Lọc bỏ các POI đã nghe (visited_ids).
        - Ưu tiên tìm POI chưa nghe gần nhất cùng tầng.
        - Nếu đã nghe hết tầng 1: Đề xuất di chuyển đến Cầu Thang để lên Tầng 2.
        - Nếu đã nghe hết cả tầng 2: Báo hoàn thành toàn bộ bảo tàng.
        """
        all_pois = POIRepository.get_all_pois()
        floor_pois = [p for p in all_pois if p.get("floor") == floor]
        
        # Parse danh sách ID đã nghe
        visited_set = set()
        if visited_ids:
            for v in str(visited_ids).split(","):
                v = v.strip()
                if v.isdigit():
                    visited_set.add(int(v))

        current_poi = None
        if current_poi_id:
            current_poi = next((p for p in all_pois if p["id"] == current_poi_id), None)

        # Toạ độ gốc khi tính khoảng cách nếu không có current_poi hoặc current_poi ở tầng khác
        stairs_coord = {"x": 300, "y": 194}
        entrance_coord = {"x": 300, "y": 368}

        origin_x = current_poi["x_coord"] if (current_poi and current_poi["floor"] == floor) else (
            stairs_coord["x"] if floor == 2 else entrance_coord["x"]
        )
        origin_y = current_poi["y_coord"] if (current_poi and current_poi["floor"] == floor) else (
            stairs_coord["y"] if floor == 2 else entrance_coord["y"]
        )

        # Lọc danh sách POI chưa nghe trên cùng tầng
        unvisited_candidates = [
            p for p in floor_pois
            if p["id"] not in visited_set and (current_poi is None or p["id"] != current_poi["id"])
        ]

        # Kiểm tra toàn bộ bảo tàng
        all_unvisited_in_museum = [p for p in all_pois if p["id"] not in visited_set]
        other_floor = 2 if floor == 1 else 1
        other_floor_unvisited = [p for p in all_pois if p.get("floor") == other_floor and p["id"] not in visited_set]

        next_poi = None
        floor_completed = False
        suggest_next_floor = None
        all_completed = False

        if unvisited_candidates:
            # Chọn POI chưa nghe gần nhất trên tầng này
            def distance(p):
                dx = p["x_coord"] - origin_x
                dy = p["y_coord"] - origin_y
                return math.sqrt(dx * dx + dy * dy)

            unvisited_candidates.sort(key=distance)
            next_poi = unvisited_candidates[0]
        else:
            # Tất cả các POI trên tầng này đã nghe!
            floor_completed = True
            
            # Chỉ coi là hoàn thành TOÀN BỘ bảo tàng khi KHÔNG CÒN BẤT KỲ POI NÀO CHƯA NGHE Ở CẢ 2 TẦNG!
            if len(all_unvisited_in_museum) == 0:
                all_completed = True
                next_poi = None
            else:
                # Tầng này đã xong nhưng tầng kia vẫn còn hiện vật -> Hướng dẫn đi Cầu Thang sang tầng kia!
                suggest_next_floor = other_floor
                action_word = "Lên" if other_floor > floor else "Xuống"
                next_poi = {
                    "id": "stairs",
                    "is_stairs": True,
                    "title": f"Cầu Thang {action_word} Tầng {other_floor}",
                    "short_description": f"Bạn đã nghe hết các hiện vật tại Tầng {floor}! Ở Tầng {other_floor} vẫn còn {len(other_floor_unvisited)} hiện vật chưa nghe. Hãy tới Cầu Thang để chuyển tầng.",
                    "x_coord": stairs_coord["x"],
                    "y_coord": stairs_coord["y"],
                    "floor": floor,
                    "image_url": None,
                }

        # Chuẩn bị dữ liệu trả về
        return {
            "current_poi": {
                "id": current_poi["id"],
                "title": current_poi["title_vi"],
                "short_description": current_poi.get("short_description_vi") or (current_poi["description_vi"][:140] if current_poi.get("description_vi") else ""),
                "x_coord": current_poi["x_coord"],
                "y_coord": current_poi["y_coord"],
                "floor": current_poi["floor"],
                "image_url": current_poi["image_url"],
                "is_visited": current_poi["id"] in visited_set
            } if current_poi else None,
            "next_poi": {
                "id": next_poi["id"],
                "is_stairs": next_poi.get("is_stairs", False),
                "title": next_poi.get("title") or next_poi.get("title_vi"),
                "short_description": next_poi.get("short_description") or next_poi.get("short_description_vi") or (next_poi["description_vi"][:140] if next_poi.get("description_vi") else ""),
                "x_coord": next_poi["x_coord"],
                "y_coord": next_poi["y_coord"],
                "floor": next_poi["floor"],
                "image_url": next_poi.get("image_url"),
                "is_visited": next_poi.get("id") in visited_set
            } if next_poi else None,
            "floor_completed": floor_completed,
            "suggest_next_floor": suggest_next_floor,
            "all_completed": all_completed,
            "all_markers": [
                {
                    "id": p["id"],
                    "title": p["title_vi"],
                    "short_description": p.get("short_description_vi") or (p["description_vi"][:140] if p.get("description_vi") else ""),
                    "x_coord": p["x_coord"],
                    "y_coord": p["y_coord"],
                    "floor": p["floor"],
                    "image_url": p["image_url"],
                    "is_visited": p["id"] in visited_set
                }
                for p in floor_pois
            ]
        }
