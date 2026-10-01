import { request } from './api';

export const visitorApi = {
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
};
