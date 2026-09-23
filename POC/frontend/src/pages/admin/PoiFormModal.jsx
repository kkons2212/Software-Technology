import React, { useState, useEffect } from 'react';
import { X, Upload, MapPin, Sparkles, Loader2 } from 'lucide-react';
import { adminApi } from '../../services/adminApi';
import InteractiveMapPicker from '../../components/admin/InteractiveMapPicker';

export default function PoiFormModal({ isOpen, onClose, onSuccess, editPoi = null, existingPois = [] }) {
  const [formData, setFormData] = useState({
    title_vi: '',
    short_description_vi: '',
    description_vi: '',
    x_coord: 150,
    y_coord: 150,
    floor: 1,
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (editPoi) {
      setFormData({
        title_vi: editPoi.title_vi || '',
        short_description_vi: editPoi.short_description_vi || '',
        description_vi: editPoi.description_vi || '',
        x_coord: editPoi.x_coord || 150,
        y_coord: editPoi.y_coord || 150,
        floor: editPoi.floor || 1,
      });
      setImagePreview(editPoi.image_url || null);
      setImageFile(null);
    } else {
      setFormData({
        title_vi: '',
        short_description_vi: '',
        description_vi: '',
        x_coord: 200,
        y_coord: 200,
        floor: 1,
      });
      setImagePreview(null);
      setImageFile(null);
    }
    setError(null);
  }, [editPoi, isOpen]);

  if (!isOpen) return null;

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title_vi.trim() || !formData.description_vi.trim()) {
      setError('Vui lòng nhập đầy đủ tiêu đề và mô tả chi tiết.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const data = new FormData();
      data.append('title_vi', formData.title_vi);
      if (formData.short_description_vi.trim()) {
        data.append('short_description_vi', formData.short_description_vi.trim());
      }
      data.append('description_vi', formData.description_vi);
      data.append('x_coord', formData.x_coord);
      data.append('y_coord', formData.y_coord);
      data.append('floor', formData.floor);
      if (imageFile) {
        data.append('image', imageFile);
      }

      if (editPoi) {
        await adminApi.updatePoi(editPoi.id, data);
      } else {
        await adminApi.createPoi(data);
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Có lỗi xảy ra khi lưu hiện vật.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl flex flex-col max-h-[90vh] shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Sticky Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 backdrop-blur-md flex-shrink-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                {editPoi ? `Chỉnh Sửa Hiện Vật #${editPoi.id}` : 'Thêm Hiện Vật Mới (UC-04)'}
              </h3>
              <p className="text-xs text-slate-400">Tự động dịch đa ngôn ngữ & sinh giọng đọc AI ngầm</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form id="poi-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Tiêu đề */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Tiêu Đề Hiện Vật (Tiếng Việt) *
            </label>
            <input
              type="text"
              value={formData.title_vi}
              onChange={(e) => setFormData({ ...formData, title_vi: e.target.value })}
              placeholder="Ví dụ: Trống Đồng Đông Sơn, Tượng Phật Bà..."
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all text-sm"
              required
            />
          </div>

          {/* Mô tả tóm tắt */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Mô Tả Tóm Tắt (Hiển thị trước khi quét QR)
              </label>
              <span className="text-[11px] text-amber-400/80">Khách du lịch xem tự do</span>
            </div>
            <textarea
              rows={2}
              value={formData.short_description_vi}
              onChange={(e) => setFormData({ ...formData, short_description_vi: e.target.value })}
              placeholder="Nhập 1-2 câu tóm tắt nổi bật (Nếu để trống, hệ thống sẽ tự trích câu đầu tiên của mô tả chi tiết)..."
              className="w-full px-4 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all text-sm resize-none"
            />
          </div>

          {/* Mô tả chi tiết */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Mô Tả Chi Tiết & Thuyết Minh Đầy Đủ (Sau khi quét QR) *
              </label>
              <span className="text-[11px] text-slate-400">Dịch 4 thứ tiếng & sinh Audio Guide</span>
            </div>
            <textarea
              rows={4}
              value={formData.description_vi}
              onChange={(e) => setFormData({ ...formData, description_vi: e.target.value })}
              placeholder="Nhập nội dung lịch sử, xuất xứ của hiện vật. Hệ thống sẽ tự động dịch sang EN, JA, KO, ZH và đọc thành audio..."
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all text-sm resize-none"
              required
            />
          </div>

          {/* Bộ chọn vị trí trực quan trên Sơ đồ Bản đồ */}
          <div>
            <InteractiveMapPicker
              xCoord={formData.x_coord}
              yCoord={formData.y_coord}
              floor={formData.floor}
              onChange={(x, y) => setFormData((prev) => ({ ...prev, x_coord: x, y_coord: y }))}
              onFloorChange={(f) => setFormData((prev) => ({ ...prev, floor: f }))}
              existingPois={existingPois}
              currentPoiId={editPoi?.id}
            />
          </div>

          {/* Tải ảnh hiện vật */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Hình Ảnh Hiện Vật
            </label>
            <div className="flex items-center gap-4">
              <label className="flex-1 flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-700 hover:border-amber-500/50 rounded-2xl cursor-pointer bg-slate-800/40 hover:bg-slate-800/80 transition-all">
                <Upload className="w-6 h-6 text-slate-400 mb-1.5" />
                <span className="text-xs text-slate-300 font-medium">Bấm để chọn file ảnh hoặc kéo thả vào đây</span>
                <span className="text-[11px] text-slate-500 mt-0.5">Hỗ trợ PNG, JPG, WEBP</span>
                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              </label>
              {imagePreview && (
                <div className="w-24 h-24 rounded-2xl overflow-hidden border border-slate-700 bg-slate-800 relative flex-shrink-0">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          </div>
        </form>

        {/* Sticky Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-end gap-3 bg-slate-900/95 backdrop-blur-md flex-shrink-0 z-10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-sm font-medium transition-colors"
          >
            Huỷ Bỏ
          </button>
          <button
            form="poi-form"
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-sm font-bold shadow-lg shadow-amber-500/20 disabled:opacity-50 transition-all"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang Lưu...
              </>
            ) : (
              editPoi ? 'Cập Nhật Hiện Vật' : 'Tạo Hiện Vật & Kích Hoạt AI'
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
