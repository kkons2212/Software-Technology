const DEFAULT_API_BASE_URL = '';
const JSON_CONTENT_TYPE_HEADER = { 'Content-Type': 'application/json' };
const REQUEST_CREDENTIALS = 'include';
const NETWORK_ERROR_CODE = 'NETWORK_ERROR';
const NETWORK_ERROR_MESSAGE = 'Unable to reach the server. Please check your connection and try again.';
const FALLBACK_ERROR_CODE = 'UNKNOWN_ERROR';
const FALLBACK_ERROR_MESSAGE = 'An unexpected error occurred. Please try again.';

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL;

export class ApiError extends Error {
  constructor({
    status = 0,
    code = FALLBACK_ERROR_CODE,
    message = FALLBACK_ERROR_MESSAGE,
    details = null,
  } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function buildRequestUrl(path) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  return `${API_BASE_URL}${path}`;
}

async function readResponsePayload(response) {
  const rawBody = await response.text();
  if (!rawBody) {
    return null;
  }
  try {
    return JSON.parse(rawBody);
  } catch {
    return null;
  }
}

function buildErrorFromResponse(response, payload) {
  const backendError = payload?.error;
  if (backendError) {
    return new ApiError({
      status: response.status,
      code: backendError.code ?? FALLBACK_ERROR_CODE,
      message: backendError.message ?? FALLBACK_ERROR_MESSAGE,
      details: backendError.details ?? null,
    });
  }
  return new ApiError({ status: response.status });
}

async function requestJson(path, { method = 'GET', body, headers, signal } = {}) {
  const requestOptions = {
    method,
    credentials: REQUEST_CREDENTIALS,
    headers: { ...JSON_CONTENT_TYPE_HEADER, ...headers },
    signal,
  };

  if (body !== undefined) {
    requestOptions.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(buildRequestUrl(path), requestOptions);
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error;
    }
    throw new ApiError({ code: NETWORK_ERROR_CODE, message: NETWORK_ERROR_MESSAGE });
  }

  const payload = await readResponsePayload(response);

  if (!response.ok) {
    throw buildErrorFromResponse(response, payload);
  }

  return payload?.data ?? payload;
}

export const apiClient = {
  get: (path, options) => requestJson(path, { ...options, method: 'GET' }),
  post: (path, body, options) => requestJson(path, { ...options, method: 'POST', body }),
  put: (path, body, options) => requestJson(path, { ...options, method: 'PUT', body }),
  patch: (path, body, options) => requestJson(path, { ...options, method: 'PATCH', body }),
  delete: (path, options) => requestJson(path, { ...options, method: 'DELETE' }),
};

export default apiClient;
