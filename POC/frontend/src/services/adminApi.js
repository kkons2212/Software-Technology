import { request } from './api';

export const adminApi = {
  // Lấy danh sách tất cả POI (UC-04)
  getAllPois: async () => {
    return await request('/api/admin/pois');
  },

  // Lấy chi tiết POI theo ID
  getPoiById: async (poiId) => {
    return await request(`/api/admin/pois/${poiId}`);
  },

  // Tạo mới POI (UC-04)
  createPoi: async (formData) => {
    return await request('/api/admin/pois', {
      method: 'POST',
      body: formData, // FormData chứa text và image file
    });
  },

  // Cập nhật POI (UC-04 A1)
  updatePoi: async (poiId, formData) => {
    return await request(`/api/admin/pois/${poiId}`, {
      method: 'PUT',
      body: formData,
    });
  },

  // Kích hoạt thủ công chuỗi AI (Dịch & Sinh Audio)
  reprocessAi: async (poiId) => {
    return await request(`/api/admin/pois/${poiId}/reprocess-ai`, {
      method: 'POST',
    });
  },

  // Xoá POI (UC-04 A2)
  deletePoi: async (poiId) => {
    return await request(`/api/admin/pois/${poiId}`, {
      method: 'DELETE',
    });
  },

  // Tái tạo mã QR (UC-05 A2)
  regenerateQrCode: async (poiId, baseUrl = null) => {
    let url = `/api/admin/pois/${poiId}/qrcode`;
    if (baseUrl) {
      url += `?base_url=${encodeURIComponent(baseUrl)}`;
    }
    return await request(url, {
      method: 'POST',
    });
  },

  // Lấy link tải mã QR về máy (UC-05)
  getQrDownloadUrl: (poiId) => {
    return `/api/admin/pois/${poiId}/qrcode/download`;
  }
};
