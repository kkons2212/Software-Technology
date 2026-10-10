import { request } from './api';

export const visitorApi = {
  // Lấy cấu hình hệ thống (tọa độ trung tâm, site name...)
  getAppConfig: async () => {
    return await request('/api/config');
  },

  // Lấy danh sách hiện vật theo ngôn ngữ & tầng (Exhibits Directory)
  getPoiList: async (lang = 'vi', floor = null) => {
    let url = `/api/visitor/pois?lang=${lang}`;
    if (floor !== null && floor !== undefined) {
      url += `&floor=${floor}`;
    }
    return await request(url);
  },

  // Lấy chi tiết hiện vật theo ngôn ngữ & trạng thái quét QR (UC-01)
  getPoiDetail: async (poiId, lang = 'vi', unlocked = true) => {
    return await request(`/api/visitor/pois/${poiId}?lang=${lang}&unlocked=${unlocked}`);
  },

  // Lấy danh sách điểm đánh dấu GPS bản đồ (UC-02)
  getMapMarkers: async (floor = null) => {
    let url = '/api/visitor/map/markers';
    if (floor !== null && floor !== undefined) {
      url += `?floor=${floor}`;
    }
    return await request(url);
  },

  // Lấy lộ trình GPS và gợi ý điểm tiếp theo (UC-02)
  getMapRecommendation: async ({ currentPoiId, floor, visitedIds, userLat, userLng } = {}) => {
    const params = new URLSearchParams();
    if (currentPoiId) params.append('current_poi_id', currentPoiId);
    if (floor) params.append('floor', floor);
    if (visitedIds) params.append('visited_ids', Array.isArray(visitedIds) ? visitedIds.join(',') : visitedIds);
    if (userLat !== undefined && userLat !== null) params.append('user_lat', userLat);
    if (userLng !== undefined && userLng !== null) params.append('user_lng', userLng);
    return await request(`/api/visitor/map/recommend?${params.toString()}`);
  },
};
