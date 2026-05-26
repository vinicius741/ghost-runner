import axios from 'axios';

type LogCallback = (message: string, type: 'normal' | 'error' | 'system') => void;
let logCallback: LogCallback | null = null;

/**
 * Register a callback to pipe API logging output directly into the UI dashboard logs.
 */
export const setApiLogCallback = (cb: LogCallback | null) => {
  logCallback = cb;
};

// Declare module extension to type-safely add custom config flags
declare module 'axios' {
  export interface AxiosRequestConfig {
    quiet?: boolean;
    silentError?: boolean;
  }
}

export const apiClient = axios.create({
  baseURL: '',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Centralized Console Log
apiClient.interceptors.request.use(
  (config) => {
    if (!config.quiet) {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Centralized Console & UI Dashboard Logging
apiClient.interceptors.response.use(
  (response) => {
    if (!response.config.quiet) {
      console.log(`[API Response] ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`);
    }
    return response;
  },
  (error) => {
    const isQuiet = error.config?.quiet;
    const isSilentError = error.config?.silentError;
    const status = error.response?.status;
    const method = error.config?.method?.toUpperCase();
    const url = error.config?.url;

    // Retrieve error message from server response data if available
    const responseData = error.response?.data;
    const serverMessage = typeof responseData === 'object' && responseData !== null && 'error' in responseData
      ? responseData.error
      : null;

    const errorMessage = serverMessage || error.message;

    if (!isQuiet) {
      console.error(`[API Error] ${method} ${url} failed with status ${status || 'network'}: ${errorMessage}`);

      if (!isSilentError && logCallback) {
        logCallback(`API Error: ${errorMessage}`, 'error');
      }
    }

    return Promise.reject(error);
  }
);
