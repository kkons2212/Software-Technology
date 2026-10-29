import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as analyticsApi from '../../../api/analyticsApi.js';
import AnalyticsExport from '../AnalyticsExport.jsx';

describe('AnalyticsExport Component (US 05.4 - TSK-05.4.2)', () => {
  beforeEach(() => {
    vi.spyOn(analyticsApi, 'exportTelemetryData').mockResolvedValue({
      blob: new Blob(['Date,Exhibit\n2026-10-29,Bunker'], { type: 'text/csv' }),
      filename: 'telemetry_report_test.csv',
    });

    // Mock createObjectURL & revokeObjectURL & click
    window.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    window.URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the export toolbar with presets and export buttons', () => {
    render(<AnalyticsExport currentRange="LAST_7_DAYS" />);

    expect(screen.getByTestId('analytics-export-toolbar')).toBeInTheDocument();
    expect(screen.getByTestId('export-preset-select')).toHaveValue('LAST_7_DAYS');
    expect(screen.getByTestId('export-csv-btn')).toBeInTheDocument();
    expect(screen.getByTestId('export-json-btn')).toBeInTheDocument();
    expect(screen.queryByTestId('custom-date-inputs')).not.toBeInTheDocument();
  });

  it('reveals custom date inputs when switching preset to CUSTOM', () => {
    render(<AnalyticsExport currentRange="LAST_7_DAYS" />);

    const select = screen.getByTestId('export-preset-select');
    fireEvent.change(select, { target: { value: 'CUSTOM' } });

    expect(screen.getByTestId('custom-date-inputs')).toBeInTheDocument();
    expect(screen.getByTestId('export-start-date')).toBeInTheDocument();
    expect(screen.getByTestId('export-end-date')).toBeInTheDocument();
  });

  it('triggers CSV export with current preset and calls file download', async () => {
    render(<AnalyticsExport currentRange="LAST_7_DAYS" />);

    fireEvent.click(screen.getByTestId('export-csv-btn'));

    await waitFor(() => {
      expect(analyticsApi.exportTelemetryData).toHaveBeenCalledWith({
        format: 'csv',
        range: 'LAST_7_DAYS',
      });
      expect(window.URL.createObjectURL).toHaveBeenCalled();
      expect(screen.getByTestId('export-success-msg')).toBeInTheDocument();
    });
  });

  it('triggers JSON export with custom date range', async () => {
    render(<AnalyticsExport currentRange="LAST_7_DAYS" />);

    fireEvent.change(screen.getByTestId('export-preset-select'), {
      target: { value: 'CUSTOM' },
    });
    fireEvent.change(screen.getByTestId('export-start-date'), {
      target: { value: '2026-10-01' },
    });
    fireEvent.change(screen.getByTestId('export-end-date'), {
      target: { value: '2026-10-15' },
    });

    fireEvent.click(screen.getByTestId('export-json-btn'));

    await waitFor(() => {
      expect(analyticsApi.exportTelemetryData).toHaveBeenCalledWith({
        format: 'json',
        startDate: '2026-10-01',
        endDate: '2026-10-15',
      });
    });
  });

  it('validates custom date inputs when dates are missing or invalid', async () => {
    render(<AnalyticsExport currentRange="LAST_7_DAYS" />);

    fireEvent.change(screen.getByTestId('export-preset-select'), {
      target: { value: 'CUSTOM' },
    });

    // 1. Missing dates
    fireEvent.click(screen.getByTestId('export-csv-btn'));
    expect(screen.getByTestId('export-error-msg')).toHaveTextContent(
      'Vui lòng chọn cả ngày bắt đầu và ngày kết thúc.',
    );
    expect(analyticsApi.exportTelemetryData).not.toHaveBeenCalled();

    // 2. startDate > endDate
    fireEvent.change(screen.getByTestId('export-start-date'), {
      target: { value: '2026-10-20' },
    });
    fireEvent.change(screen.getByTestId('export-end-date'), {
      target: { value: '2026-10-10' },
    });
    fireEvent.click(screen.getByTestId('export-csv-btn'));

    expect(screen.getByTestId('export-error-msg')).toHaveTextContent(
      'Ngày bắt đầu không được lớn hơn ngày kết thúc.',
    );
    expect(analyticsApi.exportTelemetryData).not.toHaveBeenCalled();
  });

  it('displays error message when export API fails', async () => {
    analyticsApi.exportTelemetryData.mockRejectedValue(
      new Error('Failed to export data from server'),
    );

    render(<AnalyticsExport currentRange="TODAY" />);
    fireEvent.click(screen.getByTestId('export-csv-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('export-error-msg')).toHaveTextContent(
        'Failed to export data from server',
      );
    });
  });
});
