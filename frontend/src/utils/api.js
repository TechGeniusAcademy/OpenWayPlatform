import axios from 'axios';

// Динамически определяем API URL на основе текущего хоста
// Если зашли по localhost - API будет localhost:5000
// Если зашли по IP - API будет IP:5000
const getApiUrl = () => {
  const hostname = window.location.hostname;
  return `http://${hostname}:5000/api`;
};

const API_URL = getApiUrl();
export const BASE_URL = `http://${window.location.hostname}:5000`; // Базовый URL для изображений

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Добавляем токен к каждому запросу
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Обработка ошибок
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export default api;
