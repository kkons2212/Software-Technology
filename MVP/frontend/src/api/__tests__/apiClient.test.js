import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiClient } from '../apiClient.js';

const LOGIN_ENDPOINT = '/api/v1/auth/login';

function createFetchResponse({ status = 200, body = null }) {
    return {
        ok: status >= 200 && status < 300,
        status,
        text: () => Promise.resolve(body === null ? '' : JSON.stringify(body)),
    };
}

describe('apiClient', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('unwraps the success envelope and returns the data payload', async () => {
        fetch.mockResolvedValue(createFetchResponse({ body: { success: true, data: { id: 7 } } }));

        await expect(apiClient.get('/api/v1/pois')).resolves.toEqual({ id: 7 });
        expect(fetch).toHaveBeenCalledWith(
            '/api/v1/pois',
            expect.objectContaining({ method: 'GET', credentials: 'include' }),
        );
    });

    it('returns the raw payload when no success envelope is present', async () => {
        fetch.mockResolvedValue(createFetchResponse({ body: { admin: { id: 1 } } }));

        await expect(apiClient.get('/api/v1/auth/me')).resolves.toEqual({ admin: { id: 1 } });
    });

    it('serializes the request body and sends JSON headers for POST', async () => {
        fetch.mockResolvedValue(
            createFetchResponse({ status: 201, body: { success: true, data: null } }),
        );

        await apiClient.post(LOGIN_ENDPOINT, { username: 'admin', password: 'secret' });

        const [, requestOptions] = fetch.mock.calls[0];
        expect(requestOptions.method).toBe('POST');
        expect(requestOptions.body).toBe(JSON.stringify({ username: 'admin', password: 'secret' }));
        expect(requestOptions.headers).toMatchObject({ 'Content-Type': 'application/json' });
    });

    it('throws a normalized ApiError carrying backend error details', async () => {
        fetch.mockResolvedValue(
            createFetchResponse({
                status: 423,
                body: {
                    success: false,
                    error: {
                        code: 'ACCOUNT_LOCKED',
                        message: 'Locked',
                        details: { retry_after_seconds: 850 },
                    },
                },
            }),
        );

        await expect(apiClient.post(LOGIN_ENDPOINT, {})).rejects.toMatchObject({
            name: 'ApiError',
            status: 423,
            code: 'ACCOUNT_LOCKED',
            message: 'Locked',
            details: { retry_after_seconds: 850 },
        });
    });

    it('falls back to a generic error code when the error body is missing', async () => {
        fetch.mockResolvedValue(createFetchResponse({ status: 500, body: null }));

        await expect(apiClient.get('/api/v1/health')).rejects.toMatchObject({
            status: 500,
            code: 'UNKNOWN_ERROR',
        });
    });

    it('surfaces a NETWORK_ERROR when the underlying fetch rejects', async () => {
        fetch.mockRejectedValue(new TypeError('Failed to fetch'));

        const thrownError = await apiClient.get('/api/v1/pois').catch((error) => error);

        expect(thrownError).toBeInstanceOf(ApiError);
        expect(thrownError.code).toBe('NETWORK_ERROR');
        expect(thrownError.status).toBe(0);
    });
});
