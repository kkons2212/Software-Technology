import { useCallback, useEffect, useState } from 'react';
import StorageHealthBanner from '../../components/admin/StorageHealthBanner.jsx';
import CleanOrphansModal from '../../components/admin/CleanOrphansModal.jsx';
import { getSystemHealth } from '../../api/systemApi.js';

export default function SystemHealthPage() {
  const [healthData, setHealthData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCleanModalOpen, setIsCleanModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const fetchHealth = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getSystemHealth();
      setHealthData(data);
    } catch (err) {
      setError(err?.message || 'Failed to retrieve system health telemetry.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  const handleCleanSuccess = (result) => {
    setToastMessage(
      result?.message ||
        `Successfully cleaned ${result?.deleted_count || 0} orphaned files (${result?.reclaimed_mb || 0} MB freed).`
    );
    // Automatically refresh storage health gauge upon completion (AC-05.3.3)
    fetchHealth();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">

      <main className="mx-auto w-full max-w-6xl px-6 py-8">
        {/* Top notification toast */}
        {toastMessage && (
          <div
            role="status"
            className="mb-6 flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 shadow-sm"
          >
            <span>{toastMessage}</span>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-900"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              System Health & Storage Monitoring
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Real-time server telemetry, audio cache threshold alerts (85%/95%), and orphan file pruning.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              disabled={isLoading}
              onClick={fetchHealth}
              className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
            >
              {isLoading ? 'Refreshing...' : 'Refresh Telemetry'}
            </button>
            <button
              type="button"
              onClick={() => setIsCleanModalOpen(true)}
              className="inline-flex items-center rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
            >
              Clean Orphaned Audio
            </button>
          </div>
        </div>

        {error && (
          <div role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {healthData && (
          <div className="mt-8 space-y-6">
            {/* Storage Progress Meter & Alert Banner */}
            <StorageHealthBanner
              diskUsedPercent={healthData.disk_used_percent}
              thresholdStatus={healthData.threshold_status}
              totalBytes={healthData.total_bytes}
              usedBytes={healthData.used_bytes}
              freeBytes={healthData.free_bytes}
              audioCacheBytes={healthData.audio_cache_bytes}
              audioCacheFiles={healthData.audio_cache_files}
              onCleanClick={() => setIsCleanModalOpen(true)}
            />

            {/* Service & Database Health Cards */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                  Relational Database Connectivity
                </h2>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span
                      className={`inline-block h-3 w-3 rounded-full ${
                        healthData.db_status === 'connected' ? 'bg-emerald-500' : 'bg-red-500'
                      }`}
                      aria-hidden="true"
                    />
                    <span className="text-base font-semibold capitalize text-slate-900">
                      {healthData.db_status}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">MySQL Database</span>
                </div>
                <div className="mt-4 flex justify-between border-t border-slate-100 pt-3 text-xs text-slate-600">
                  <span>Ping Roundtrip Latency:</span>
                  <span className="font-mono font-medium text-slate-800">
                    {healthData.db_latency_ms >= 0 ? `${healthData.db_latency_ms} ms` : 'N/A'}
                  </span>
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                  External Service Integrations
                </h2>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span
                      className={`inline-block h-3 w-3 rounded-full ${
                        healthData.external_services_ok ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                      aria-hidden="true"
                    />
                    <span className="text-base font-semibold text-slate-900">
                      Operational
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">Neural TTS & Payment Gateway</span>
                </div>
                <div className="mt-4 flex justify-between border-t border-slate-100 pt-3 text-xs text-slate-600">
                  <span>API Server State:</span>
                  <span className="font-semibold uppercase text-emerald-700">
                    {healthData.status}
                  </span>
                </div>
              </section>
            </div>
          </div>
        )}
      </main>

      <CleanOrphansModal
        isOpen={isCleanModalOpen}
        onClose={() => setIsCleanModalOpen(false)}
        onSuccess={handleCleanSuccess}
      />
    </div>
  );
}
