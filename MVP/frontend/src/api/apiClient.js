const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

export async function getJson(path, { signal } = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Accept: 'application/json' },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json();
}
