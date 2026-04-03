import axios from 'axios';

const client = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.request.use(config => {
  const token = localStorage.getItem('pdi_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  res => res,
  err => {
    // Only force-redirect on 401 for authenticated routes, not the login endpoint itself
    if (err.response?.status === 401 && !err.config?.url?.includes('/auth/login')) {
      localStorage.removeItem('pdi_token');
      localStorage.removeItem('pdi_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default client;
