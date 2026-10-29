import { Outlet } from 'react-router-dom';
import AdminNavbar from './AdminNavbar.jsx';

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <AdminNavbar />
      <div className="flex-1 w-full">
        <Outlet />
      </div>
    </div>
  );
}
