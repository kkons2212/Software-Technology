// =============================================================================
// TIER 1 - APPLICATION SHELL TESTS
// The Application shell is now a Router (see src/App.jsx): the root path
// redirects into the protected Admin Portal, so every render needs a Router and
// an AuthProvider (AdminLoginView consumes useAuth).
// =============================================================================

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App.jsx';
import { AuthProvider } from '../contexts/AuthContext.jsx';

function renderApp(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  );
}

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
describe('App Component', () => {
  beforeEach(() => {
    // Anonymous bootstrap: the session probe finds no valid cookie session.
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({}),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('redirects the root path into the protected admin route', async () => {
    renderApp('/');
    const heading = await screen.findByRole('heading', {
      level: 1,
      name: /administrator sign in/i,
    });
    expect(heading).toBeInTheDocument();
  });

  it('renders the administrator sign-in screen on the admin login route', async () => {
    renderApp('/admin/login');
    const heading = await screen.findByRole('heading', {
      level: 1,
      name: /administrator sign in/i,
    });
    expect(heading).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
  });
});
