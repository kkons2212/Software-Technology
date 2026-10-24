import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../App.jsx';

vi.mock('../api/languageApi.js', () => ({
  getPublishedLanguages: vi.fn().mockResolvedValue([
    { code: 'vi', name: 'Tiếng Việt' },
    { code: 'en', name: 'English' },
  ]),
}));

vi.mock('../views/visitor/VisitorMapView.jsx', () => ({
  default: () => <section aria-label="Outdoor museum map" />,
}));

describe('App', () => {
  it('renders the visitor map and published language selector', async () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Cu Chi Tunnels' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Outdoor museum map' })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Tiếng Việt' })).toBeInTheDocument();
    });
  });
});
