/**
 * Generic API Hook for Ghost Runner Frontend using Axios under the hood
 */

import { useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { apiClient } from '@/lib/apiClient';

/**
 * Return type for the useApi hook.
 * Provides a generic API client with loading, error, and data states.
 */
export interface UseApiResult<TData> {
  /** Fetch data from an API endpoint */
  fetch: (url: string, init?: RequestInit) => Promise<TData>;
  /** Current data state */
  data: TData | null;
  /** Loading state */
  loading: boolean;
  /** Error state */
  error: Error | null;
  /** Abort the current request */
  abort: () => void;
  /** Reset state to initial values */
  reset: () => void;
}

/**
 * Options for configuring the useApi hook behavior.
 */
export interface UseApiOptions<TData = unknown> {
  /** Abort request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Custom headers to include with every request */
  headers?: Record<string, string>;
  /** Callback called on successful fetch */
  onSuccess?: (data: TData) => void;
  /** Callback called on fetch error */
  onError?: (error: Error) => void;
}

/**
 * Default timeout for API requests (30 seconds).
 */
const DEFAULT_TIMEOUT = 30000;

/**
 * Generic API hook with loading, error, and data states.
 */
export function useApi<TData = unknown>(options: UseApiOptions<TData> = {}): UseApiResult<TData> {
  const { timeout = DEFAULT_TIMEOUT, headers = {}, onSuccess, onError } = options;

  const [data, setData] = useState<TData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Reset all state to initial values.
   */
  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  /**
   * Fetch data from an API endpoint with automatic timeout and abort support.
   */
  const fetch = useCallback(
    async (url: string, init: RequestInit = {}): Promise<TData> => {
      // Abort any existing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller for this request
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setLoading(true);
      setError(null);

      try {
        const response = await apiClient({
          url,
          method: init.method || 'GET',
          headers: {
            ...headers,
            ...init.headers,
          } as Record<string, string>,
          data: init.body,
          timeout,
          signal: abortController.signal,
        });

        const responseData = response.data;

        // Handle API error responses
        if (
          typeof responseData === 'object' &&
          responseData !== null &&
          'error' in responseData
        ) {
          throw new Error((responseData as { error: string }).error);
        }

        // Extract data if wrapped in response object
        const extractedData =
          typeof responseData === 'object' &&
          responseData !== null &&
          'data' in responseData
            ? (responseData as { data: TData }).data
            : (responseData as TData);

        setData(extractedData);
        setLoading(false);
        onSuccess?.(extractedData);
        return extractedData;
      } catch (err) {
        setLoading(false);

        // Handle abort/cancel errors
        if (axios.isCancel(err)) {
          const error = new Error('Request cancelled');
          setError(error);
          onError?.(error);
          throw error;
        }

        // Handle other errors
        const error =
          err instanceof Error ? err : new Error('An unknown error occurred');
        setError(error);
        onError?.(error);
        throw error;
      } finally {
        abortControllerRef.current = null;
      }
    },
    [timeout, headers, onSuccess, onError]
  );

  /**
   * Abort the current request.
   */
  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
  }, []);

  return { fetch, data, loading, error, abort, reset };
}

/**
 * Hook for making GET requests.
 * Convenience wrapper around useApi.
 */
export function useGet<TData = unknown>(
  url: string,
  options: UseApiOptions<TData> = {}
): UseApiResult<TData> & { refetch: () => Promise<TData> } {
  const api = useApi<TData>(options);

  const refetch = useCallback(async () => {
    return api.fetch(url, { method: 'GET' });
  }, [api, url]);

  return { ...api, fetch: refetch, refetch };
}

/**
 * Hook for making POST requests.
 * Convenience wrapper around useApi.
 */
export function usePost<TData = unknown, TBody = unknown>(
  url: string,
  options: UseApiOptions<TData> = {}
): Omit<UseApiResult<TData>, 'fetch'> & {
  post: (body: TBody) => Promise<TData>;
} {
  const api = useApi<TData>(options);

  const post = useCallback(
    async (body: TBody): Promise<TData> => {
      return api.fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    },
    [api, url]
  );

  return { ...api, post };
}
