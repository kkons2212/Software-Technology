import { Compass } from 'lucide-react';

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
          Đường dẫn bạn yêu cầu không tồn tại hoặc đã được thay đổi.
        </p>
      </div>
    </main>
  );
}
