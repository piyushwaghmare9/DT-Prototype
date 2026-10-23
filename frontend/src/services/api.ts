import axios from 'axios';

const isLocalhost = Boolean(
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
   window.location.hostname === '127.0.0.1' ||
   window.location.hostname === '[::1]')
);

// In local dev default to http://localhost:8000/api/v1.
// In cloud/Vercel default to configured VITE_API_BASE_URL or relative /api/v1.
const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  (isLocalhost ? 'http://localhost:8000/api/v1' : '/api/v1');

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cx_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 → redirect to login safely without false kickouts
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
      const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register');
      const currentToken = localStorage.getItem('cx_token');
      const reqAuth = err.config?.headers?.Authorization;
      const requestToken = typeof reqAuth === 'string' ? reqAuth.replace(/^Bearer\s+/i, '').trim() : null;

      // Check if user authenticated recently (within last 5 seconds) to avoid race conditions during route transition
      const authTime = parseInt(localStorage.getItem('cx_auth_time') || '0', 10);
      const isFreshAuth = Date.now() - authTime < 5000;

      // Only force redirect if:
      // 1. Not already on an auth screen
      // 2. We actually had an active token that was sent with this request and explicitly rejected
      // 3. Not within the fresh login transition grace period
      if (!isAuthPage && currentToken && requestToken && requestToken === currentToken && !isFreshAuth) {
        localStorage.removeItem('cx_token');
        localStorage.removeItem('cx_user');
        localStorage.removeItem('cx_auth_time');
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
