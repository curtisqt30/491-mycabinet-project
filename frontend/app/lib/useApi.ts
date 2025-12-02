import { useCallback, useState } from 'react';
import { authFetch } from './auth';
import { useAuth } from './AuthContext';

const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  process.env.EXPO_PUBLIC_API_BASE ??
  'http://127.0.0.1:8000/api/v1';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type ApiError = {
  status: number;
  message: string;
  detail?: any;
};

type UseApiOptions = {
  // If true, will throw on session expired instead of logging out
  throwOnExpired?: boolean;
};

/**
 * Hook for making authenticated API calls.
 * Automatically handles token refresh and session expiration.
 */
export function useApi(options: UseApiOptions = {}) {
  const { logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const request = useCallback(
    async <T = any>(
      endpoint: string,
      method: HttpMethod = 'GET',
      body?: any,
    ): Promise<T> => {
      setLoading(true);
      setError(null);

      const url = endpoint.startsWith('http')
        ? endpoint
        : `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

      try {
        const response = await authFetch(url, {
          method,
          headers: body
            ? {
                'Content-Type': 'application/json',
                Accept: 'application/json',
              }
            : { Accept: 'application/json' },
          body: body ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const apiError: ApiError = {
            status: response.status,
            message:
              errorData.detail ||
              `Request failed with status ${response.status}`,
            detail: errorData,
          };
          setError(apiError);
          throw apiError;
        }

        // Handle 204 No Content
        if (response.status === 204) {
          return undefined as T;
        }

        const data = await response.json();
        return data as T;
      } catch (err: any) {
        // Handle session expired
        if (
          err?.message === 'Session expired' ||
          err?.message === 'Not authenticated'
        ) {
          if (options.throwOnExpired) {
            throw err;
          }
          // Force logout and redirect to login
          await logout();
          throw err;
        }

        // Re-throw API errors
        if (err?.status) {
          throw err;
        }

        // Network or other errors
        const networkError: ApiError = {
          status: 0,
          message: err?.message || 'Network error',
        };
        setError(networkError);
        throw networkError;
      } finally {
        setLoading(false);
      }
    },
    [logout, options.throwOnExpired],
  );

  // Convenience methods
  const get = useCallback(
    <T = any>(endpoint: string) => request<T>(endpoint, 'GET'),
    [request],
  );

  const post = useCallback(
    <T = any>(endpoint: string, body?: any) =>
      request<T>(endpoint, 'POST', body),
    [request],
  );

  const put = useCallback(
    <T = any>(endpoint: string, body?: any) =>
      request<T>(endpoint, 'PUT', body),
    [request],
  );

  const patch = useCallback(
    <T = any>(endpoint: string, body?: any) =>
      request<T>(endpoint, 'PATCH', body),
    [request],
  );

  const del = useCallback(
    <T = any>(endpoint: string, body?: any) =>
      request<T>(endpoint, 'DELETE', body),
    [request],
  );

  return {
    request,
    get,
    post,
    put,
    patch,
    del,
    loading,
    error,
    clearError: () => setError(null),
  };
}

/**
 * Simple authenticated fetch wrapper for one-off requests.
 * For repeated requests, prefer useApi hook.
 */
export async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const response = await authFetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw {
      status: response.status,
      message: errorData.detail || `Request failed`,
      detail: errorData,
    };
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}
