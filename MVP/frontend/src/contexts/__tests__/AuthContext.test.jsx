import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockAuthApi, mockIdleTimer } = vi.hoisted(() => ({
  mockAuthApi: { fetchCurrentAdmin: vi.fn(), loginAdmin: vi.fn(), logoutAdmin: vi.fn() },
  mockIdleTimer: vi.fn(),
}));

vi.mock('../../api/authApi.js', () => mockAuthApi);
// The hook has its own paired suite; here it is stubbed so the idle expiry can
// be triggered deterministically instead of waiting on a wall clock.
vi.mock('../../hooks/useIdleTimer.js', () => ({ default: mockIdleTimer }));

import {
  AuthProvider,
  LOGOUT_REASON_IDLE,
  LOGOUT_REASON_MANUAL,
  useAuth,
} from '../AuthContext.jsx';

function renderAuthHook() {
  return renderHook(() => useAuth(), { wrapper: AuthProvider });
}

function getLatestIdleOptions() {
  const calls = mockIdleTimer.mock.calls;
  return calls[calls.length - 1][0];
}

describe('AuthContext', () => {
  beforeEach(() => {
    mockAuthApi.fetchCurrentAdmin.mockReset();
    mockAuthApi.loginAdmin.mockReset();
    mockAuthApi.logoutAdmin.mockReset();
    mockIdleTimer.mockReset();
  });

  it('starts in the bootstrapping state before the session resolves', () => {
    mockAuthApi.fetchCurrentAdmin.mockReturnValue(new Promise(() => { }));

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

  it('exposes the administrator profile through the `user` alias', async () => {
    mockAuthApi.fetchCurrentAdmin.mockResolvedValue({
      user_name: 'admin',
      full_name: 'System Administrator',
    });

    const { result } = renderAuthHook();

    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));
    expect(result.current.user).toEqual({
      user_name: 'admin',
      full_name: 'System Administrator',
    });
  });

  it('revokes the session server-side and clears local state on logout', async () => {
    mockAuthApi.fetchCurrentAdmin.mockResolvedValue({ user_name: 'admin' });
    mockAuthApi.logoutAdmin.mockResolvedValue({ message: 'Administrator session terminated' });

    const { result } = renderAuthHook();
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

    await act(async () => {
      await result.current.logout();
    });

    expect(mockAuthApi.logoutAdmin).toHaveBeenCalledTimes(1);
    expect(result.current.currentAdmin).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.logoutReason).toBe(LOGOUT_REASON_MANUAL);
  });

  it('still clears the local session when the logout request fails', async () => {
    mockAuthApi.fetchCurrentAdmin.mockResolvedValue({ user_name: 'admin' });
    mockAuthApi.logoutAdmin.mockRejectedValue(new Error('Not authenticated'));

    const { result } = renderAuthHook();
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.logoutReason).toBe(LOGOUT_REASON_MANUAL);
  });

  it('wipes the session and records the idle reason when the idle timer expires', async () => {
    mockAuthApi.fetchCurrentAdmin.mockResolvedValue(null);
    mockAuthApi.loginAdmin.mockResolvedValue({ user_name: 'admin' });
    mockAuthApi.logoutAdmin.mockResolvedValue({ message: 'Administrator session terminated' });

    const { result } = renderAuthHook();
    await waitFor(() => expect(result.current.isBootstrapping).toBe(false));

    await act(async () => {
      await result.current.login({ username: 'admin', password: 'pw' });
    });
    expect(getLatestIdleOptions().isEnabled).toBe(true);

    await act(async () => {
      await getLatestIdleOptions().onIdle();
    });

    expect(mockAuthApi.logoutAdmin).toHaveBeenCalledTimes(1);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.logoutReason).toBe(LOGOUT_REASON_IDLE);
  });

  it('clears the termination reason after a successful sign-in', async () => {
    mockAuthApi.fetchCurrentAdmin.mockResolvedValue({ user_name: 'admin' });
    mockAuthApi.logoutAdmin.mockResolvedValue({ message: 'Administrator session terminated' });
    mockAuthApi.loginAdmin.mockResolvedValue({ user_name: 'admin' });

    const { result } = renderAuthHook();
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

    await act(async () => {
      await result.current.logout();
    });
    expect(result.current.logoutReason).toBe(LOGOUT_REASON_MANUAL);

    await act(async () => {
      await result.current.login({ username: 'admin', password: 'pw' });
    });

    expect(result.current.logoutReason).toBeNull();
  });

  it('throws when useAuth is consumed outside of an AuthProvider', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

    expect(() => renderHook(() => useAuth())).toThrow(
      'useAuth must be used within an AuthProvider.',
    );

    consoleErrorSpy.mockRestore();
  });
});
