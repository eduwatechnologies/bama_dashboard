import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { clearAuthSession, getAccessToken, getRefreshToken, setSession } from './auth';
import type { ApiErrorBody, ApiErrorCode } from './types';

const baseURL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ??
  'http://localhost:4000/api/v1/admin';

export const api: AxiosInstance = axios.create({
  baseURL,
  timeout: 20_000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  try {
    const { data } = await axios.post<{
      success: true;
      data: { accessToken: string; refreshToken: string; admin: unknown };
    }>(
      `${baseURL}/auth/refresh`,
      { refreshToken },
      { headers: { 'Content-Type': 'application/json' }, timeout: 15_000 },
    );
    setSession({
      accessToken: data.data.accessToken,
      refreshToken: data.data.refreshToken,
    });
    return data.data.accessToken;
  } catch {
    clearAuthSession();
    return null;
  }
}

type RetryableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorBody>) => {
    const original = error.config as RetryableConfig | undefined;
    const status = error.response?.status;

    if (
      status === 401 &&
      original &&
      !original._retry &&
      !original.url?.includes('/auth/')
    ) {
      original._retry = true;
      if (!refreshInFlight) {
        refreshInFlight = refreshAccessToken().finally(() => {
          refreshInFlight = null;
        });
      }
      const newToken = await refreshInFlight;
      if (newToken) {
        original.headers.set('Authorization', `Bearer ${newToken}`);
        return api.request(original);
      }
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export function extractErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError<ApiErrorBody>(err)) {
    return err.response?.data?.error?.message ?? err.message ?? fallback;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

export function extractErrorCode(err: unknown): ApiErrorCode | null {
  if (axios.isAxiosError<ApiErrorBody>(err)) {
    return (err.response?.data?.error?.code as ApiErrorCode | undefined) ?? null;
  }
  return null;
}

export function extractFieldErrors(
  err: unknown,
): Array<{ field: string; message: string }> | undefined {
  if (axios.isAxiosError<ApiErrorBody>(err)) {
    return err.response?.data?.error?.details;
  }
  return undefined;
}
