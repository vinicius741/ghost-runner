/**
 * Generic API Hook for Ghost Runner Frontend
 *
 * This hook provides a generic API client with loading, error, and data states.
 * Extracted from App.tsx for reusability across components.
 *
 * Related: Development Execution Plan Task 1.3.1
 */

import { useState, useCallback, useRef } from 'react';

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
 *
 * @param options - Optional configuration for the hook
 * @returns API client object with state and fetch function
 *
 * @example
 * const { fetch, data, loading, error } = useApi<Task[]>({ timeout: 5000 });
 *
 * useEffect(() => {
 *   fetch('/api/tasks').then(setTasks);
 * }, []);
 */
export function useApi<TData = unknown>(options: UseApiOptions<TData> = {}): UseApiResult<TData> {
  const { timeout = DEFAULT_TIMEOUT, headers = {}, onSuccess, onError } = options;

  const [data, setData] = useState<TData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  /**
   * Fetch data from an API endpoint with automatic timeout and abort support.
   *
   * @param url - The URL to fetch from
   * @param init - Optional fetch init options
   * @returns Promise resolving to the fetched data
   * @throws Error if the request fails or times out
   */
  const fetch = useCallback(
    async (url: string, init: RequestInit = {}): Promise<TData> => {
      // Abort any existing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Create new abort controller for this request
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setLoading(true);
      setError(null);

      // Set up timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutRef.current = setTimeout(() => {
          abortController.abort();
          reject(new Error(`Request timeout after ${timeout}ms`));
        }, timeout);
      });

      try {
        // Make the fetch request with timeout using global fetch to avoid shadowing
        const response = (await Promise.race([
          globalThis.fetch(url, {
            ...init,
            headers: {
              'Content-Type': 'application/json',
              ...headers,
              ...init.headers,
            },
            signal: abortController.signal,
          }),
          timeoutPromise,
        ])) as Response;

        // Clear timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }

        // Check for HTTP errors
        if (!response.ok) {
          const errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          const error = new Error(errorMessage);
          throw error;
        }

        // Parse response
        const contentType = response.headers.get('content-type');
        let responseData: unknown;

        if (contentType?.includes('application/json')) {
          responseData = await response.json();
        } else {
          responseData = await response.text();
        }

        // Handle API error responses
        if (
          typeof responseData === 'object' &&
          responseData !== null &&
          'error' in responseData
        ) {
          throw new Error((responseData as { error: string }).error);
        }

        // Extract data if wrapped in response object
        const data =
          typeof responseData === 'object' &&
          responseData !== null &&
          'data' in responseData
            ? (responseData as { data: TData }).data
            : (responseData as TData);

        setData(data);
        setLoading(false);
        onSuccess?.(data);
        return data;
      } catch (err) {
        setLoading(false);

        // Handle abort errors (user cancelled or timeout)
        if (err instanceof Error && err.name === 'AbortError') {
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
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setLoading(false);
  }, []);

  return { fetch, data, loading, error, abort, reset };
}

/**
 * Hook for making GET requests.
 * Convenience wrapper around useApi.
 *
 * @param url - The URL to fetch from
 * @param options - Optional configuration
 * @returns Object with fetch function and state
 *
 * @example
 * const { data, loading, error, refetch } = useGet<Task[]>('/api/tasks');
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
 *
 * @param url - The URL to post to
 * @param options - Optional configuration
 * @returns Object with post function and state
 *
 * @example
 * const { post, loading, error } = usePost('/api/tasks');
 * await post({ task: 'my_task' });
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
        body: JSON.stringify(body),
      });
    },
    [api, url]
  );

  return { ...api, post };
}
