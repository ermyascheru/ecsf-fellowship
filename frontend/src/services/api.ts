import axios from 'axios';

const rawEnvUrl = String((import.meta as any).env?.VITE_API_URL || '').trim();
// If empty or points to unconfigured custom domain, fallback to live Render backend
const effectiveUrl = (!rawEnvUrl || rawEnvUrl.includes('ecsf-fellowship.com'))
  ? 'https://ecsf-fellowship-1.onrender.com/api'
  : (rawEnvUrl.endsWith('/api') ? rawEnvUrl : `${rawEnvUrl.replace(/\/+$/, '')}/api`);

export const api = axios.create({
  baseURL: effectiveUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
