/**
 * Centralized API client
 * In production: relative paths (same-origin via Cloudflare routing)
 * In development: Vite proxy handles /api -> localhost:8787
 */

const TOKEN_KEY = 'swedishLearningToken';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * Make an authenticated API request
 */
export async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(path, { ...options, headers });
  return response;
}
