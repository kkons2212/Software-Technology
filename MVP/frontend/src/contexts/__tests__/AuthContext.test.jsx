import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockAuthApi } = vi.hoisted(() => ({
  mockAuthApi: { fetchCurrentAdmin: vi.fn(), loginAdmin: vi.fn() },
}));

vi.mock('../../api/authApi.js', () => mockAuthApi);

import { AuthProvider, useAuth } from '../AuthContext.jsx';

function renderAuthHook() {
  return renderHook(() => useAuth(), { wrapper: AuthProvider });
}

describe('AuthContext', () => {
  beforeEach(() => {
    mockAuthApi.fetchCurrentAdmin.mockReset();
    mockAuthApi.loginAdmin.mockReset();
  });

  it('starts in the bootstrapping state before the session resolves', () => {
    mockAuthApi.fetchCurrentAdmin.mockReturnValue(new Promise(() => {}));

    const { result } = renderAuthHook();

    expect(result.current.isBootstrapping).toBe(true);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.currentAdmin).toBeNull();
  });

  it('restores an authenticated administrator from the cookie session', async () => {
    mockAuthApi.fetchCurrentAdmin.mockResolvedValue({ id: 1, username: 'admin' });

    const { result } = renderAuthHook();

    await waitFor(() => expect(result.current.isBootstrapping).toBe(false));
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.currentAdmin).toEqual({ id: 1, username: 'admin' });
  });

  it('stays anonymous when the session bootstrap rejects', async () => {
    mockAuthApi.fetchCurrentAdmin.mockRejectedValue(new Error('HTTP 401'));

    const { result } = renderAuthHook();

    await waitFor(() => expect(result.current.isBootstrapping).toBe(false));
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.currentAdmin).toBeNull();
  });

  it('treats a null bootstrap payload as an anonymous visitor', async () => {
    mockAuthApi.fetchCurrentAdmin.mockResolvedValue(null);

    const { result } = renderAuthHook();

    await waitFor(() => expect(result.current.isBootstrapping).toBe(false));
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('authenticates the administrator after a successful login', async () => {
    mockAuthApi.fetchCurrentAdmin.mockResolvedValue(null);
    mockAuthApi.loginAdmin.mockResolvedValue({ id: 9, username: 'new-admin' });

    const { result } = renderAuthHook();
    await waitFor(() => expect(result.current.isBootstrapping).toBe(false));

    await act(async () => {
      await result.current.login({ username: 'new-admin', password: 'pw' });
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.currentAdmin).toEqual({ id: 9, username: 'new-admin' });
  });

  it('keeps the session anonymous when login rejects', async () => {
    mockAuthApi.fetchCurrentAdmin.mockResolvedValue(null);
    mockAuthApi.loginAdmin.mockRejectedValue(new Error('Invalid username or password'));

    const { result } = renderAuthHook();
    await waitFor(() => expect(result.current.isBootstrapping).toBe(false));

    await act(async () => {
      await expect(
        result.current.login({ username: 'x', password: 'y' }),
      ).rejects.toThrow('Invalid username or password');
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.currentAdmin).toBeNull();
  });

  it('throws when useAuth is consumed outside of an AuthProvider', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => renderHook(() => useAuth())).toThrow(
      'useAuth must be used within an AuthProvider.',
    );

    consoleErrorSpy.mockRestore();
  });
});
