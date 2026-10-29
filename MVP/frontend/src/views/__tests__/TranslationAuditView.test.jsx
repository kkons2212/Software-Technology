import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TranslationAuditView from '../admin/TranslationAuditView.jsx';
import * as translationApi from '../../api/translationApi.js';
import * as poiApi from '../../api/poiApi.js';
import * as languageApi from '../../api/languageApi.js';

describe('TranslationAuditView (US 04.1 Multilingual Translation Audit & US 04.3 Publication)', () => {
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
    {
      stran_id: 'TR_003',
      poi_id: 'POI_002',
      poi_title: 'Hầm chông tự tạo',
      language_id: 'en',
      language_name: 'English',
      title: 'Booby Trap',
      short_description: 'Traditional defense trap',
      description: 'Spike pit trap designed for guerrilla warfare.',
      status: 'DRAFT',
      source_title: 'Hầm chông tự tạo',
      source_short_description: 'Vũ khí thô sơ',
      source_description: 'Bẫy chông thời kháng chiến.',
      audio_url: 'https://example.com/audio_trap.mp3',
      audio_status: 'READY',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(poiApi, 'getPois').mockResolvedValue({ items: mockPois, total: 2 });
    vi.spyOn(languageApi, 'getSupportedLanguages').mockResolvedValue([
      { code: 'vi', name: 'Tiếng Việt' },
      { code: 'en', name: 'English' },
      { code: 'ja', name: 'Japanese' },
      { code: 'ko', name: 'Korean' },
      { code: 'zh', name: 'Chinese' },
      { code: 'fr', name: 'French' },
    ]);
    vi.spyOn(translationApi, 'getTranslations').mockResolvedValue({
      items: mockTranslations,
      total: 3,
    });
    vi.spyOn(translationApi, 'updateTranslation').mockImplementation(async (id, payload) => ({
      ...mockTranslations[0],
      ...payload,
      status: 'NEEDS_UPDATE',
    }));
    vi.spyOn(translationApi, 'regenerateTranslationAudio').mockResolvedValue({
      stran_id: 'TR_002',
      status: 'DRAFT',
      audio_url: '/static/audio/regenerated.mp3',
      audio_status: 'READY',
    });
    vi.spyOn(translationApi, 'publishTranslation').mockResolvedValue({
      stran_id: 'TR_003',
      status: 'PUBLISHED',
      audio_status: 'READY',
      review_by: 'admin',
    });
  });

  it('dynamically loads supported target languages from the catalog API into filter dropdown', async () => {
    render(<TranslationAuditView />);

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'French (fr)' })).toBeDefined();
    });

    const langSelect = screen.getByTestId('filter-language');
    expect(langSelect.innerHTML).toContain('French (fr)');
    expect(langSelect.innerHTML).not.toContain('Tiếng Việt (vi)');
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

  it('renders 2-column side-by-side comparison layout for translations (AC-04.1.1)', async () => {
    render(<TranslationAuditView />);

    await waitFor(() => {
      expect(screen.getByTestId('translation-row-TR_001')).toBeDefined();
    });

    expect(screen.getAllByTestId('source-column').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('target-column').length).toBeGreaterThan(0);
  });

  it('renders read-only Vietnamese source text correctly', async () => {
    render(<TranslationAuditView />);

    await waitFor(() => {
      expect(screen.getAllByTestId('source-title')[0].textContent).toContain('Địa đạo Bến Dược');
    });
    expect(screen.getAllByTestId('source-short-desc')[0].textContent).toContain('Khu di tích cách mạng');
  });

  it('updates draft state and displays unsaved edits indicator when editing target fields', async () => {
    render(<TranslationAuditView />);

    await waitFor(() => {
      expect(screen.getByTestId('target-title-input-TR_001')).toBeDefined();
    });

    const titleInput = screen.getByTestId('target-title-input-TR_001');
    fireEvent.change(titleInput, { target: { value: 'Ben Duoc Historical Relic Tunnel' } });

    expect(titleInput.value).toBe('Ben Duoc Historical Relic Tunnel');
    expect(screen.getByText('Unsaved Edits')).toBeDefined();
    expect(screen.getByTestId('save-btn-TR_001').disabled).toBe(false);
  });

  it('triggers updateTranslation API call and updates status on Save Draft (AC-04.1.3)', async () => {
    render(<TranslationAuditView />);

    await waitFor(() => {
      expect(screen.getByTestId('target-title-input-TR_001')).toBeDefined();
    });

    fireEvent.change(screen.getByTestId('target-title-input-TR_001'), {
      target: { value: 'Updated Title' },
    });
    fireEvent.click(screen.getByTestId('save-btn-TR_001'));

    await waitFor(() => {
      expect(translationApi.updateTranslation).toHaveBeenCalledWith(
        'TR_001',
        expect.objectContaining({ title: 'Updated Title' })
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('audit-notification')).toBeDefined();
    });
  });

  it('filters translations when selecting a specific language', async () => {
    render(<TranslationAuditView />);

    await waitFor(() => {
      expect(screen.getByTestId('filter-language')).toBeDefined();
    });

    fireEvent.change(screen.getByTestId('filter-language'), { target: { value: 'en' } });

    await waitFor(() => {
      expect(translationApi.getTranslations).toHaveBeenCalledWith(
        expect.objectContaining({ languageId: 'en' })
      );
    });
  });

  it('filters translations when selecting a specific POI', async () => {
    render(<TranslationAuditView />);

    await waitFor(() => {
      expect(screen.getByTestId('filter-poi')).toBeDefined();
    });

    fireEvent.change(screen.getByTestId('filter-poi'), { target: { value: 'POI_001' } });

    await waitFor(() => {
      expect(translationApi.getTranslations).toHaveBeenCalledWith(
        expect.objectContaining({ poiId: 'POI_001' })
      );
    });
  });

  it('shows empty state when no translations match the query', async () => {
    vi.spyOn(translationApi, 'getTranslations').mockResolvedValueOnce({
      items: [],
      total: 0,
    });

    render(<TranslationAuditView />);

    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeDefined();
    });
  });

  it('shows error state when fetching translations fails', async () => {
    vi.spyOn(translationApi, 'getTranslations').mockRejectedValueOnce(
      new Error('Backend unavailable')
    );

    render(<TranslationAuditView />);

    await waitFor(() => {
      expect(screen.getByTestId('error-state').textContent).toContain(
        'Backend unavailable'
      );
    });
  });

  it('shows an error notification when saving edited text fails', async () => {
    vi.spyOn(translationApi, 'updateTranslation').mockRejectedValueOnce(
      new Error('Save failed')
    );
    render(<TranslationAuditView />);

    await waitFor(() => {
      expect(screen.getByTestId('target-title-input-TR_001')).toBeDefined();
    });
    fireEvent.change(screen.getByTestId('target-title-input-TR_001'), {
      target: { value: 'Edited title' },
    });
    fireEvent.click(screen.getByTestId('save-btn-TR_001'));

    await waitFor(() => {
      expect(screen.getByTestId('audit-notification').textContent).toContain(
        'Save failed'
      );
    });
  });

  it('refreshes row audio and unlocks publish after successful regeneration', async () => {
    render(<TranslationAuditView />);

    await waitFor(() => {
      expect(screen.getByTestId('regenerate-audio-TR_002')).toBeDefined();
    });
    expect(screen.getByTestId('publish-btn-TR_002').disabled).toBe(true);

    fireEvent.click(screen.getByTestId('regenerate-audio-TR_002'));

    await waitFor(() => {
      expect(screen.getByTestId('publish-btn-TR_002').disabled).toBe(false);
    });
    expect(screen.getByTestId('audio-player-TR_002')).toBeDefined();
    expect(screen.getByTestId('audit-notification').textContent).toContain(
      'Audio Guide regenerated successfully'
    );
    expect(translationApi.regenerateTranslationAudio).toHaveBeenCalledWith('TR_002');
  });

  it('removes a regenerated translation from the active status filter', async () => {
    render(<TranslationAuditView />);

    await waitFor(() => {
      expect(screen.getByTestId('translation-row-TR_002')).toBeDefined();
    });
    fireEvent.change(screen.getByTestId('filter-status'), {
      target: { value: 'NEEDS_UPDATE' },
    });
    await waitFor(() => {
      expect(translationApi.getTranslations).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'NEEDS_UPDATE' })
      );
    });

    fireEvent.click(screen.getByTestId('regenerate-audio-TR_002'));

    await waitFor(() => {
      expect(screen.queryByTestId('translation-row-TR_002')).toBeNull();
    });
  });

  // =========================================================================
  // US 04.3: Administrative Approval & Live Mobile App Synchronization Tests
  // =========================================================================
  it('publishes translation successfully when publish button is clicked (US 04.3)', async () => {
    render(<TranslationAuditView />);

    await waitFor(() => {
      expect(screen.getByTestId('publish-btn-TR_003')).toBeDefined();
    });

    const publishBtn = screen.getByTestId('publish-btn-TR_003');
    expect(publishBtn.disabled).toBe(false);

    fireEvent.click(publishBtn);

    await waitFor(() => {
      expect(translationApi.publishTranslation).toHaveBeenCalledWith('TR_003');
    });

    await waitFor(() => {
      expect(screen.getByTestId('audit-notification').textContent).toContain(
        "Published 'Booby Trap' successfully. Now live for visitors."
      );
    });
  });

  it('handles publish error notification when publish API fails (US 04.3)', async () => {
    vi.spyOn(translationApi, 'publishTranslation').mockRejectedValueOnce(
      new Error('Publication rejected by server')
    );

    render(<TranslationAuditView />);

    await waitFor(() => {
      expect(screen.getByTestId('publish-btn-TR_003')).toBeDefined();
    });

    fireEvent.click(screen.getByTestId('publish-btn-TR_003'));

    await waitFor(() => {
      expect(screen.getByTestId('audit-notification').textContent).toContain(
        'Publication rejected by server'
      );
    });
  });

  it('removes published translation from row if active filter is DRAFT (US 04.3)', async () => {
    render(<TranslationAuditView />);

    await waitFor(() => {
      expect(screen.getByTestId('translation-row-TR_003')).toBeDefined();
    });

    fireEvent.change(screen.getByTestId('filter-status'), {
      target: { value: 'DRAFT' },
    });

    await waitFor(() => {
      expect(translationApi.getTranslations).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'DRAFT' })
      );
    });

    fireEvent.click(screen.getByTestId('publish-btn-TR_003'));

    await waitFor(() => {
      expect(screen.queryByTestId('translation-row-TR_003')).toBeNull();
    });
  });
});
