import axios from 'axios';

function normalizeApiBaseUrl(value: string | undefined) {
  const rawUrl = value?.trim() || 'http://localhost:3001/api';
  const withoutTrailingSlash = rawUrl.replace(/\/+$/, '');

  return withoutTrailingSlash.endsWith('/api')
    ? withoutTrailingSlash
    : `${withoutTrailingSlash}/api`;
}

export function getApiBaseUrl() {
  return normalizeApiBaseUrl(import.meta.env.VITE_API_URL);
}

export const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.message;
      if (typeof message === 'string' && message.trim().length > 0) {
        return Promise.reject(new Error(message));
      }
    }

    return Promise.reject(error);
  },
);
