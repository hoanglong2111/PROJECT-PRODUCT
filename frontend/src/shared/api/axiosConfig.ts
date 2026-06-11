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
      const v1Error = error.response?.data?.errors?.[0];
      const v1Message = v1Error?.message;
      if (typeof v1Message === 'string' && v1Message.trim().length > 0) {
        const normalizedError = new Error(v1Message) as Error & { code?: string };
        if (typeof v1Error?.code === 'string') {
          normalizedError.code = v1Error.code;
        }
        return Promise.reject(normalizedError);
      }

      const message = error.response?.data?.message;
      if (typeof message === 'string' && message.trim().length > 0) {
        return Promise.reject(new Error(message));
      }
    }

    return Promise.reject(error);
  },
);
