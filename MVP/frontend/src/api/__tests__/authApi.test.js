import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockApiClient } = vi.hoisted(() => ({
  mockApiClient: { get: vi.fn(), post: vi.fn() },
}));

vi.mock('../apiClient.js', () => ({ apiClient: mockApiClient }));

import { fetchCurrentAdmin, loginAdmin } from '../authApi.js';

describe('authApi', () => {
  beforeEach(() => {
    mockApiClient.get.mockReset();
    mockApiClient.post.mockReset();
  });

  it('posts credentials to the login endpoint and returns the administrator profile', async () => {
    mockApiClient.post.mockResolvedValue({ admin: { id: 1, username: 'curator' } });

    const administrator = await loginAdmin({ username: 'curator', password: 'pw' });

    expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/auth/login', {
      username: 'curator',
      password: 'pw',
    });
    expect(administrator).toEqual({ id: 1, username: 'curator' });
  });

  it('returns the raw payload when the login response has no admin key', async () => {
    mockApiClient.post.mockResolvedValue({ id: 2, username: 'root' });

    await expect(loginAdmin({ username: 'root', password: 'pw' })).resolves.toEqual({
      id: 2,
      username: 'root',
    });
  });

  it('propagates authentication failures to the caller', async () => {
    mockApiClient.post.mockRejectedValue(new Error('Invalid username or password'));

    await expect(loginAdmin({ username: 'x', password: 'y' })).rejects.toThrow(
      'Invalid username or password',
    );
  });

  it('fetches the current administrator from the session endpoint', async () => {
    mockApiClient.get.mockResolvedValue({ admin: { id: 3 } });

    await expect(fetchCurrentAdmin()).resolves.toEqual({ id: 3 });
    expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/auth/me');
  });

  it('resolves to null when the session endpoint returns nothing', async () => {
    mockApiClient.get.mockResolvedValue(null);

    await expect(fetchCurrentAdmin()).resolves.toBeNull();
  });
});
