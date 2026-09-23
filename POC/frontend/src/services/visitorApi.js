import { request } from './api';

export const visitorApi = {
  // Lấy chi tiết hiện vật theo ngôn ngữ & trạng thái quét QR (UC-01)
  getPoiDetail: async (poiId, lang = 'vi', unlocked = true) => {
    return await request(`/api/visitor/pois/${poiId}?lang=${lang}&unlocked=${unlocked}`);
  },

  // Lấy danh sách điểm đánh dấu trên bản đồ (UC-02)
  getMapMarkers: async (floor = 1) => {
    return await request(`/api/visitor/map/markers?floor=${floor}`);
  },

  // Lấy gợi ý lộ trình và vị trí hiện tại (UC-02)
  getRouteRecommendation: async (currentPoiId = null, floor = 1) => {
    let url = `/api/visitor/map/recommend?floor=${floor}`;
    if (currentPoiId) {
      url += `&current_poi_id=${currentPoiId}`;
    }
    return await request(url);
  },
};
