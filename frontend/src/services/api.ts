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

// Handle 401 → redirect to login (only when not already on auth pages)
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (
      err.response?.status === 401 &&
      !window.location.pathname.startsWith('/login') &&
      !window.location.pathname.startsWith('/register')
    ) {
      localStorage.removeItem('cx_token');
      localStorage.removeItem('cx_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
