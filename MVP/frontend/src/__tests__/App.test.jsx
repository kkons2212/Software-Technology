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

  it('redirects the root path into the protected admin route', async () => {
    renderApp('/');

    expect(
      await screen.findByRole('heading', { level: 1, name: /administrator sign in/i }),
    ).toBeInTheDocument();
  });

  it('renders the administrator sign-in screen on the admin login route', async () => {
    renderApp('/admin/login');

    expect(
      await screen.findByRole('heading', { level: 1, name: /administrator sign in/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
  });

  it('renders the visitor tour page with the outdoor map on the visitor route', async () => {
    renderApp('/visitor');

    expect(
      await screen.findByRole('heading', { level: 1, name: /cu chi tunnels/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /outdoor museum map/i })).toBeInTheDocument();
  });
});
