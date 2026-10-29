import { useState } from 'react';
import PropTypes from 'prop-types';
import { exportTelemetryData, ANALYTICS_TIME_RANGES } from '../../api/analyticsApi.js';

export function triggerFileDownload(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => window.URL.revokeObjectURL(url), 100);
}

export default function AnalyticsExport({ currentRange = ANALYTICS_TIME_RANGES.LAST_7_DAYS }) {
  const [selectedPreset, setSelectedPreset] = useState(currentRange);
  const [isCustomDate, setIsCustomDate] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const handlePresetChange = (e) => {
    const val = e.target.value;
    if (val === 'CUSTOM') {
      setIsCustomDate(true);
    } else {
      setIsCustomDate(false);
      setSelectedPreset(val);
    }
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleExport = async (format) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (isCustomDate) {
      if (!startDate || !endDate) {
        setErrorMessage('Vui lòng chọn cả ngày bắt đầu và ngày kết thúc.');
        return;
      }
      if (startDate > endDate) {
        setErrorMessage('Ngày bắt đầu không được lớn hơn ngày kết thúc.');
        return;
      }
    }

    setIsExporting(true);
    try {
      const options = { format };
      if (isCustomDate) {
        options.startDate = startDate;
        options.endDate = endDate;
      } else {
        options.range = selectedPreset;
      }

      const { blob, filename } = await exportTelemetryData(options);
      triggerFileDownload(blob, filename);
      setSuccessMessage(`Đã xuất thành công file ${format.toUpperCase()} (${filename})`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      setErrorMessage(err.message || 'Có lỗi xảy ra khi xuất dữ liệu báo cáo.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm mb-6" data-testid="analytics-export-toolbar">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Title & Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
            <svg
              className="w-4 h-4 text-emerald-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <span>Xuất dữ liệu Viễn trắc</span>
          </div>

          {/* Preset Selector */}
          <select
            value={isCustomDate ? 'CUSTOM' : selectedPreset}
            onChange={handlePresetChange}
            disabled={isExporting}
            className="text-xs bg-slate-50 border border-slate-300 text-slate-700 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            data-testid="export-preset-select"
          >
            <option value={ANALYTICS_TIME_RANGES.TODAY}>Hôm nay</option>
            <option value={ANALYTICS_TIME_RANGES.LAST_7_DAYS}>7 ngày qua</option>
            <option value={ANALYTICS_TIME_RANGES.LAST_30_DAYS}>30 ngày qua</option>
            <option value="CUSTOM">Tùy chọn ngày...</option>
          </select>

          {/* Custom Date Pickers */}
          {isCustomDate && (
            <div className="flex items-center gap-2" data-testid="custom-date-inputs">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={isExporting}
                className="text-xs bg-slate-50 border border-slate-300 text-slate-700 rounded-lg px-2 py-1 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                data-testid="export-start-date"
              />
              <span className="text-xs text-slate-400">→</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={isExporting}
                className="text-xs bg-slate-50 border border-slate-300 text-slate-700 rounded-lg px-2 py-1 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                data-testid="export-end-date"
              />
            </div>
          )}
        </div>

        {/* Right: Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleExport('csv')}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-medium shadow-sm transition-colors disabled:opacity-50"
            data-testid="export-csv-btn"
          >
            {isExporting ? (
              <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm3 2h6v4H7V5zm8 8H5v-2h10v2zm0-4H9V7h6v2z" />
              </svg>
            )}
            <span>Xuất CSV (Excel)</span>
          </button>

          <button
            type="button"
            onClick={() => handleExport('json')}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-800 active:bg-slate-900 text-white rounded-lg text-xs font-medium shadow-sm transition-colors disabled:opacity-50"
            data-testid="export-json-btn"
          >
            {isExporting ? (
              <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            )}
            <span>Xuất JSON</span>
          </button>
        </div>
      </div>

      {/* Alert Banners */}
      {errorMessage && (
        <div className="mt-3 text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-2.5 flex items-center justify-between" data-testid="export-error-msg">
          <span>{errorMessage}</span>
          <button type="button" onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-rose-700 font-bold ml-2">×</button>
        </div>
      )}
      {successMessage && (
        <div className="mt-3 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 flex items-center justify-between" data-testid="export-success-msg">
          <span>{successMessage}</span>
          <button type="button" onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-800 font-bold ml-2">×</button>
        </div>
      )}
    </div>
  );
}

AnalyticsExport.propTypes = {
  currentRange: PropTypes.string,
};
