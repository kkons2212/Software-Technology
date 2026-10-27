import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TranslationAuditView from '../admin/TranslationAuditView.jsx';
import * as translationApi from '../../api/translationApi.js';
import * as poiApi from '../../api/poiApi.js';

describe('TranslationAuditView (US 04.1 Multilingual Translation Audit)', () => {
  const mockPois = [
    { poi_id: 'POI_001', title: 'Địa đạo Bến Dược' },
    { poi_id: 'POI_002', title: 'Hầm chông tự tạo' },
  ];

  const mockTranslations = [
    {
      stran_id: 'TR_001',
      poi_id: 'POI_001',
      poi_title: 'Địa đạo Bến Dược',
      language_id: 'en',
      language_name: 'English',
      title: 'Ben Duoc Tunnels',
      short_description: 'Revolutionary tunnel complex',
      description: 'Historical underground tunnels used in wartime.',
      status: 'PUBLISHED',
      source_title: 'Địa đạo Bến Dược',
      source_short_description: 'Khu di tích cách mạng',
      source_description: 'Hệ thống hầm ngầm thời chiến.',
      audio_url: 'https://example.com/audio_en.mp3',
      audio_status: 'READY',
    },
    {
      stran_id: 'TR_002',
      poi_id: 'POI_001',
      poi_title: 'Địa đạo Bến Dược',
      language_id: 'ja',
      language_name: 'Japanese',
      title: 'ベンズオックトンネル',
      short_description: '革命的なトンネル',
      description: '戦争中に使用された地下トンネル。',
      status: 'NEEDS_UPDATE',
      source_title: 'Địa đạo Bến Dược',
      source_short_description: 'Khu di tích cách mạng',
      source_description: 'Hệ thống hầm ngầm thời chiến.',
      audio_url: null,
      audio_status: null,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(poiApi, 'getPois').mockResolvedValue({ items: mockPois, total: 2 });
    vi.spyOn(translationApi, 'getTranslations').mockResolvedValue({
      items: mockTranslations,
      total: 2,
    });
    vi.spyOn(translationApi, 'updateTranslation').mockImplementation(async (id, payload) => ({
      ...mockTranslations[0],
      ...payload,
      status: 'NEEDS_UPDATE',
    }));
  });

  it('renders 3-tier filter bar with POI, Language, and Status selectors (AC-04.1.2)', async () => {
    render(<TranslationAuditView />);

    await waitFor(() => {
      expect(screen.getByTestId('translation-filter-bar')).toBeDefined();
    });

    expect(screen.getByTestId('filter-poi')).toBeDefined();
    expect(screen.getByTestId('filter-language')).toBeDefined();
    expect(screen.getByTestId('filter-status')).toBeDefined();
  });

  it('renders 2-column side-by-side comparison layout for each translation (AC-04.1.1)', async () => {
    render(<TranslationAuditView />);

    await waitFor(() => {
      expect(screen.getByTestId('translation-row-TR_001')).toBeDefined();
    });

    // Check Vietnamese source column
    expect(screen.getAllByTestId('source-column').length).toBe(2);
    expect(screen.getAllByTestId('source-title')[0].textContent).toContain('Địa đạo Bến Dược');
    expect(screen.getAllByTestId('source-desc')[0].textContent).toContain('Hệ thống hầm ngầm thời chiến.');

    // Check editable target column
    expect(screen.getAllByTestId('target-column').length).toBe(2);
    const titleInput = screen.getByTestId('target-title-input-TR_001');
    expect(titleInput.value).toBe('Ben Duoc Tunnels');
  });

  it('immediately updates status badge to "Audio Needs Update" and locks publish button on keystroke edit (AC-04.1.3)', async () => {
    render(<TranslationAuditView />);

    await waitFor(() => {
      expect(screen.getByTestId('translation-row-TR_001')).toBeDefined();
    });

    const rowTR1 = screen.getByTestId('translation-row-TR_001');

    // Initially TR_001 is PUBLISHED -> Audio In Sync, publish unlocked
    expect(rowTR1.textContent).toContain('Audio In Sync');
    const publishBtn = screen.getByTestId('publish-btn-TR_001');
    expect(publishBtn.disabled).toBe(false);

    // Edit the target title
    const titleInput = screen.getByTestId('target-title-input-TR_001');
    fireEvent.change(titleInput, { target: { value: 'Ben Duoc Revolutionary Tunnels' } });

    // Instantly shows "Audio Needs Update"
    expect(rowTR1.textContent).toContain('Audio Needs Update');

    // Publish button is locked
    expect(publishBtn.disabled).toBe(true);
    expect(publishBtn.textContent).toContain('Publish Locked');
  });

  it('saves modified draft and calls updateTranslation API', async () => {
    render(<TranslationAuditView />);

    await waitFor(() => {
      expect(screen.getByTestId('translation-row-TR_001')).toBeDefined();
    });

    const titleInput = screen.getByTestId('target-title-input-TR_001');
    fireEvent.change(titleInput, { target: { value: 'Ben Duoc Revolutionary Site' } });

    const saveBtn = screen.getByTestId('save-btn-TR_001');
    expect(saveBtn.disabled).toBe(false);

    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(translationApi.updateTranslation).toHaveBeenCalledWith(
        'TR_001',
        expect.objectContaining({
          title: 'Ben Duoc Revolutionary Site',
        })
      );
    });

    // Displays success notification
    await waitFor(() => {
      expect(screen.getByTestId('audit-notification')).toBeDefined();
      expect(screen.getByTestId('audit-notification').textContent).toContain('Saved');
    });
  });

  it('triggers filtered translation query when 3-tier dropdown filter changes', async () => {
    render(<TranslationAuditView />);

    await waitFor(() => {
      expect(screen.getByTestId('filter-language')).toBeDefined();
    });

    fireEvent.change(screen.getByTestId('filter-language'), { target: { value: 'en' } });

    await waitFor(() => {
      expect(translationApi.getTranslations).toHaveBeenCalledWith(
        expect.objectContaining({
          languageId: 'en',
        })
      );
    });
  });

  it('displays empty state message when no translations match filter', async () => {
    vi.spyOn(translationApi, 'getTranslations').mockResolvedValueOnce({
      items: [],
      total: 0,
    });

    render(<TranslationAuditView />);

    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeDefined();
      expect(screen.getByTestId('empty-state').textContent).toContain('No translations match');
    });
  });
});
