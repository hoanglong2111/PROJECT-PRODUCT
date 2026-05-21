import axios from 'axios';

export const AUTH_TOKEN_STORAGE_KEY = 'kbfe.auth.token';

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api',
  timeout: 15_000,
});

export function setHttpAuthToken(token: string | null) {
  if (token) {
    http.defaults.headers.common.Authorization = `Bearer ${token}`;
    return;
  }

  delete http.defaults.headers.common.Authorization;
}

export function getApiErrorMessage(error: unknown, fallback = 'Could not determine error details.') {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data as { errors?: Array<{ message?: string }> } | undefined;
    const apiMessage = responseData?.errors?.find((item) => item.message)?.message;

    return apiMessage ?? error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

if (typeof window !== 'undefined') {
  setHttpAuthToken(window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY));
}
