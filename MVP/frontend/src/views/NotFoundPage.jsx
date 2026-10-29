import { Compass, MapPin, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4 text-center">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
        {/* Brand Header */}
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 shadow-sm">
          <Compass size={32} aria-hidden="true" />
        </div>

        <div className="inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-600">
          Lỗi 404 · Page Not Found
        </div>

        <h1 className="mt-4 text-xl font-bold text-slate-900 sm:text-2xl">
          Không tìm thấy trang
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Đường dẫn bạn yêu cầu không tồn tại hoặc đã được thay đổi. Quý khách vui lòng chọn hành động bên dưới:
        </p>

        {/* Action Navigation Buttons */}
        <div className="mt-6 flex flex-col gap-3">
          <Link
            to="/visitor"
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-1 active:scale-[0.99]"
          >
            <MapPin size={18} aria-hidden="true" />
            <span>Về bản đồ tham quan</span>
          </Link>

          <Link
            to="/admin/login"
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300 active:scale-[0.99]"
          >
            <Shield size={18} aria-hidden="true" />
            <span>Cổng quản trị viên</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
