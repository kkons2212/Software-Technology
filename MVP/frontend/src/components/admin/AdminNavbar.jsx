import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import StorageHealthBanner from './StorageHealthBanner.jsx';
import CleanOrphansModal from './CleanOrphansModal.jsx';
import { getSystemHealth } from '../../api/systemApi.js';

export default function AdminNavbar() {
  const location = useLocation();
  const { logout, user } = useAuth();
  const [storageAlert, setStorageAlert] = useState(null);
  const [isCleanModalOpen, setIsCleanModalOpen] = useState(false);

  useEffect(() => {
    let isActive = true;
    getSystemHealth()
      .then((data) => {
        if (isActive) {
          if (data && Number(data.disk_used_percent) >= 85) {
            setStorageAlert(data);
          } else {
            setStorageAlert(null);
          }
        }
      })
      .catch(() => {
        // Silently ignore telemetry failure in general navbar
      });

    return () => {
      isActive = false;
    };
  }, [location.pathname]);

  const navLinks = [
    { path: '/admin/pois', label: 'POI & Geofence' },
    { path: '/admin/translations', label: 'Translations & Audio' },
    { path: '/admin/analytics', label: 'Analytics & Heatmap' },
    { path: '/admin/health', label: 'System Health' },
  ];

  return (
    <>
      {/* Unified sticky container: ensures Header & Storage Alert NEVER overlap */}
      <div className="sticky top-0 z-30 w-full bg-white shadow-sm">
        <header className="flex h-14 w-full items-center justify-between border-b border-slate-200 px-6">
          <div className="flex items-center space-x-6">
            <Link to="/admin" className="text-sm font-bold tracking-tight text-slate-900">
              Cu Chi Tunnels <span className="font-normal text-slate-500">Admin</span>
            </Link>
            <nav className="flex space-x-1" aria-label="Admin Navigation">
              {navLinks.map(({ path, label }) => {
                const isActive = location.pathname.startsWith(path);
                return (
                  <Link
                    key={path}
                    to={path}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-slate-100 text-slate-900 font-semibold'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-xs text-slate-600">
              {/* The profile contract exposes `user_name` (AdminProfileResponse). */}
              {user?.user_name || user?.full_name || 'Administrator'}
            </span>
            <button
              type="button"
              onClick={() => logout()}
              className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              Sign Out
            </button>
          </div>
        </header>

        {storageAlert && (
          <div className="w-full border-b border-slate-200 bg-slate-50/80 px-6 py-2">
            <StorageHealthBanner
              diskUsedPercent={storageAlert.disk_used_percent}
              thresholdStatus={storageAlert.threshold_status}
              stickyOnly={true}
              onCleanClick={() => setIsCleanModalOpen(true)}
            />
          </div>
        )}
      </div>

      <CleanOrphansModal
        isOpen={isCleanModalOpen}
        onClose={() => setIsCleanModalOpen(false)}
        onSuccess={() => {
          setStorageAlert(null);
        }}
      />
    </>
  );
}
