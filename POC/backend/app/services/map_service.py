import math
from typing import List, Dict, Any, Optional
from app.repositories.poi_repository import POIRepository
from config import DEFAULT_MAP_LAT, DEFAULT_MAP_LNG, DEFAULT_MAP_ZOOM, SITE_NAME

def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Tính khoảng cách đường chim bay (mét) giữa 2 tọa độ GPS thực tế."""
    R = 6371000  # Bán kính Trái Đất (mét)
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 1)

class MapService:
    @staticmethod
    def get_map_markers(floor: Optional[int] = None) -> List[Dict[str, Any]]:
        """Lấy danh sách toạ độ GPS các hiện vật ngoài trời."""
        pois = POIRepository.get_all_pois()
        markers = []
        for p in pois:
            if floor is None or p.get("floor") == floor:
                lat = p.get("latitude") if p.get("latitude") is not None else DEFAULT_MAP_LAT
                lng = p.get("longitude") if p.get("longitude") is not None else DEFAULT_MAP_LNG
                markers.append({
                    "id": p["id"],
                    "title": p["title_vi"],
                    "short_description": p.get("short_description_vi") or (p["description_vi"][:140] if p.get("description_vi") else ""),
                    "latitude": lat,
                    "longitude": lng,
                    "x_coord": p.get("x_coord", 0),
                    "y_coord": p.get("y_coord", 0),
                    "floor": p.get("floor", 1),
                    "image_url": p.get("image_url"),
                })
        return markers

    @staticmethod
    def get_route_recommendation(
        current_poi_id: Optional[int] = None,
        floor: Optional[int] = None,
        visited_ids: Optional[str] = None,
        user_lat: Optional[float] = None,
        user_lng: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Tính toán lộ trình GPS và gợi ý hiện vật ngoài trời tiếp theo (UC-02).
        Thuật toán:
        - Sử dụng vị trí GPS trực tiếp của khách (user_lat, user_lng) nếu có;
          hoặc vị trí của POI vừa quét (current_poi_id);
          hoặc tâm di tích mặc định (DEFAULT_MAP_LAT, DEFAULT_MAP_LNG).
        - Tính khoảng cách Haversine (mét) đến các POI chưa nghe (chưa có trong visited_ids).
        - Gợi ý POI gần nhất kèm khoảng cách (mét) và thời gian đi bộ ước tính.
        """
        all_pois = POIRepository.get_all_pois()

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

        # Xác định tọa độ gốc của khách (Origin GPS)
        if user_lat is not None and user_lng is not None:
            origin_lat = float(user_lat)
            origin_lng = float(user_lng)
            has_gps = True
        elif current_poi and current_poi.get("latitude") is not None and current_poi.get("longitude") is not None:
            origin_lat = float(current_poi["latitude"])
            origin_lng = float(current_poi["longitude"])
            has_gps = False
        else:
            origin_lat = DEFAULT_MAP_LAT
            origin_lng = DEFAULT_MAP_LNG
            has_gps = False

        # Danh sách POI chưa nghe
        unvisited_candidates = [
            p for p in all_pois
            if p["id"] not in visited_set and (current_poi is None or p["id"] != current_poi["id"])
        ]

        all_completed = len(all_pois) > 0 and len(unvisited_candidates) == 0
        next_poi = None
        next_distance = 0.0

        if unvisited_candidates:
            # Sắp xếp theo khoảng cách mét gần nhất
            def get_dist(p):
                p_lat = p.get("latitude") if p.get("latitude") is not None else DEFAULT_MAP_LAT
                p_lng = p.get("longitude") if p.get("longitude") is not None else DEFAULT_MAP_LNG
                return haversine_distance_meters(origin_lat, origin_lng, p_lat, p_lng)

            unvisited_candidates.sort(key=get_dist)
            best_candidate = unvisited_candidates[0]
            next_distance = get_dist(best_candidate)

            best_lat = best_candidate.get("latitude") if best_candidate.get("latitude") is not None else DEFAULT_MAP_LAT
            best_lng = best_candidate.get("longitude") if best_candidate.get("longitude") is not None else DEFAULT_MAP_LNG

            # Thời gian đi bộ ước tính: ~1.2 m/s (khoảng 70m/phút)
            walking_mins = max(1, round(next_distance / 70))

            next_poi = {
                "id": best_candidate["id"],
                "title": best_candidate["title_vi"],
                "short_description": best_candidate.get("short_description_vi") or (best_candidate["description_vi"][:140] if best_candidate.get("description_vi") else ""),
                "latitude": best_lat,
                "longitude": best_lng,
                "floor": best_candidate.get("floor", 1),
                "image_url": best_candidate.get("image_url"),
                "distance_meters": next_distance,
                "walking_minutes": walking_mins,
                "is_visited": False
            }

        # Định dạng danh sách toàn bộ markers kèm khoảng cách
        all_markers = []
        for p in all_pois:
            p_lat = p.get("latitude") if p.get("latitude") is not None else DEFAULT_MAP_LAT
            p_lng = p.get("longitude") if p.get("longitude") is not None else DEFAULT_MAP_LNG
            dist = haversine_distance_meters(origin_lat, origin_lng, p_lat, p_lng)
            all_markers.append({
                "id": p["id"],
                "title": p["title_vi"],
                "short_description": p.get("short_description_vi") or (p["description_vi"][:140] if p.get("description_vi") else ""),
                "latitude": p_lat,
                "longitude": p_lng,
                "floor": p.get("floor", 1),
                "image_url": p.get("image_url"),
                "distance_meters": dist,
                "is_visited": p["id"] in visited_set,
                "is_current": current_poi and p["id"] == current_poi["id"]
            })

        # Sắp xếp markers theo khoảng cách
        all_markers.sort(key=lambda m: m["distance_meters"])

        return {
            "site_info": {
                "name": SITE_NAME,
                "center_lat": DEFAULT_MAP_LAT,
                "center_lng": DEFAULT_MAP_LNG,
                "zoom": DEFAULT_MAP_ZOOM,
            },
            "visitor_origin": {
                "latitude": origin_lat,
                "longitude": origin_lng,
                "has_live_gps": has_gps
            },
            "current_poi": {
                "id": current_poi["id"],
                "title": current_poi["title_vi"],
                "short_description": current_poi.get("short_description_vi") or (current_poi["description_vi"][:140] if current_poi.get("description_vi") else ""),
                "latitude": current_poi.get("latitude") if current_poi.get("latitude") is not None else DEFAULT_MAP_LAT,
                "longitude": current_poi.get("longitude") if current_poi.get("longitude") is not None else DEFAULT_MAP_LNG,
                "floor": current_poi.get("floor", 1),
                "image_url": current_poi.get("image_url"),
                "is_visited": current_poi["id"] in visited_set
            } if current_poi else None,
            "next_poi": next_poi,
            "all_completed": all_completed,
            "all_markers": all_markers,
            "total_unvisited": len(unvisited_candidates)
        }
