import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App.jsx';
import { AuthProvider } from '../contexts/AuthContext.jsx';

// Leaflet cannot run in jsdom, so the map engine and its marker overlay are
// mocked the same way VisitorMapView.test.jsx does it. This keeps these
// assertions focused on route wiring in App.jsx rather than on map internals.
vi.mock('leaflet', () => ({
  default: {
    map: vi.fn(() => ({
      panTo: vi.fn(),
      setView: vi.fn(),
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
      remove: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    })),
    latLngBounds: vi.fn(() => ({})),
    tileLayer: vi.fn(() => ({ addTo: vi.fn() })),
  },
}));

vi.mock('../components/visitor/VisitorLocationMarker.jsx', () => ({
  default: () => null,
}));

function renderApp(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('App', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        headers: new Headers({ 'content-type': 'application/json' }),
        text: async () => JSON.stringify({}),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the visitor tour page on the root path', async () => {
    renderApp('/');

    expect(
      await screen.findByRole('heading', { level: 1, name: /cu chi tunnels/i }, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /outdoor museum map/i })).toBeInTheDocument();
  });

  it('renders the administrator sign-in screen on the admin login route', async () => {
    renderApp('/admin/login');

    expect(
      await screen.findByRole('heading', { level: 1, name: /administrator sign in/i }, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
  });

  it('renders the visitor tour page with the outdoor map on the visitor route', async () => {
    renderApp('/visitor');

    expect(
      await screen.findByRole('heading', { level: 1, name: /cu chi tunnels/i }, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /outdoor museum map/i })).toBeInTheDocument();
  });

  it('redirects the /tour alias path to the visitor tour page', async () => {
    renderApp('/tour');

    expect(
      await screen.findByRole('heading', { level: 1, name: /cu chi tunnels/i }, { timeout: 5000 }),
    ).toBeInTheDocument();
  });

  it('renders the checkout success page on the visitor checkout success route', async () => {
    renderApp('/visitor/checkout/success');

    expect(
      await screen.findByRole('heading', { level: 1, name: /payment successful/i }, { timeout: 5000 }),
    ).toBeInTheDocument();
  });

  it('redirects unauthenticated access to /admin/pois into the login view', async () => {
    renderApp('/admin/pois');

    expect(
      await screen.findByRole('heading', { level: 1, name: /administrator sign in/i }, { timeout: 5000 }),
    ).toBeInTheDocument();
  });

  it('renders the admin navigation layout for authenticated admin routes', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url) => {
        const urlStr = String(url);
        if (urlStr.includes('/api/v1/auth/me')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            text: async () => JSON.stringify({ admin: { user_name: 'admin', role: 'admin' } }),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          text: async () => JSON.stringify({}),
        });
      }),
    );

    renderApp('/admin/health');

    expect(
      await screen.findByRole('navigation', { name: /admin navigation/i }, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /system health/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
  });

  it('renders the 404 not found page on any unknown wildcard route', async () => {
    renderApp('/unknown/non-existent-page');

    expect(
      await screen.findByRole('heading', { level: 1, name: /không tìm thấy trang/i }, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/đường dẫn bạn yêu cầu không tồn tại/i),
    ).toBeInTheDocument();
  });
});
