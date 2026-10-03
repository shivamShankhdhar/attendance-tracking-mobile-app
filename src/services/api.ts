import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const REFRESH_TOKEN_KEY = 'attendance_refresh_token';
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || (
  Platform.OS === 'web' && typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname)
    ? 'http://localhost:5001/api/v1'
    : 'https://www.attendance-tracker.shivamshankhdhar.online/api/v1'
);
let memoryAccessToken: string | null = null;
let sessionVersion = 0;
let refreshPromise: Promise<string> | null = null;
let onUnauthorized: (() => void) | undefined;
let storageQueue: Promise<unknown> = Promise.resolve();
export const setUnauthorizedHandler = (handler: () => void) => { onUnauthorized = handler; };
export const getSessionVersion = () => sessionVersion;
export const setMemoryAccessToken = (token: string | null) => { memoryAccessToken = token; };
export const getMemoryAccessToken = () => memoryAccessToken;
export const invalidateSession = () => {
  sessionVersion++;
  memoryAccessToken = null;
  refreshPromise = null;
};
function writeStorage(token: string | null): Promise<void> {
  const operation = storageQueue.catch(() => {}).then(async () => {
    if (Platform.OS === 'web') {
      if (token === null) localStorage.removeItem(REFRESH_TOKEN_KEY);
      else localStorage.setItem(REFRESH_TOKEN_KEY, token);
    } else if (token === null) await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    else await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
  });
  storageQueue = operation;
  return operation;
}
export const saveRefreshToken = (token: string) => writeStorage(token);
export const clearStoredRefreshToken = () => writeStorage(null);
export async function getStoredRefreshToken(): Promise<string | null> {
  await storageQueue.catch(() => {});
  return Platform.OS === 'web' ? localStorage.getItem(REFRESH_TOKEN_KEY) : SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}
export class ApiError extends Error {
  constructor(message: string, public statusCode: number, public code: string, public details?: unknown) {
    super(message);
    this.name = 'ApiError';
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export function isApiError(error: unknown): error is ApiError {
  return (
    error instanceof ApiError ||
    (typeof error === 'object' &&
      error !== null &&
      ((error as any).name === 'ApiError' || typeof (error as any).statusCode === 'number'))
  );
}

async function send(endpoint: string, options: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, signal: controller.signal });
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      const errorMsg = result?.error?.message || (typeof result?.error === 'string' ? result.error : 'Request failed');
      const errorCode = result?.error?.code || 'REQUEST_FAILED';
      throw new ApiError(errorMsg, response.status, errorCode, result?.error?.details);
    }
    return result?.data;
  } catch (error) {
    if (isApiError(error)) throw error;
    console.warn(`[API Network Error] ${options.method || 'GET'} ${endpoint}:`, error);
    throw new ApiError('Unable to reach the server. Check your connection and try again.', 0, 'NETWORK_ERROR');
  } finally {
    clearTimeout(timeout);
  }
}
import { isReviewerToken, handleReviewerApiRequest, REVIEWER_ACCESS_TOKEN } from './reviewerMockApi';

export function refreshAccessToken(): Promise<string> {
  if (refreshPromise) return refreshPromise;
  const version = sessionVersion;
  const pending = (async () => {
    const refreshToken = await getStoredRefreshToken();
    if (isReviewerToken(refreshToken)) {
      memoryAccessToken = REVIEWER_ACCESS_TOKEN;
      return REVIEWER_ACCESS_TOKEN;
    }
    if (!refreshToken) throw new ApiError('Please sign in again.', 401, 'UNAUTHORIZED');
    const data = await send('/auth/refresh', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken }) });
    if (version !== sessionVersion) throw new ApiError('Session ended.', 401, 'SESSION_ENDED');
    if (data.refreshToken) await saveRefreshToken(data.refreshToken);
    if (version !== sessionVersion) throw new ApiError('Session ended.', 401, 'SESSION_ENDED');
    memoryAccessToken = data.accessToken;
    return data.accessToken as string;
  })();
  refreshPromise = pending;
  void pending.finally(() => { if (refreshPromise === pending) refreshPromise = null; }).catch(() => {});
  return pending;
}
const isMpinRejection = (error: unknown) =>
  isApiError(error) && ['INVALID_MPIN', 'INVALID_CURRENT_MPIN', 'MPIN_LOCKED'].includes(error.code);

export async function apiRequest<T = any>(endpoint: string, options: {
  method?: string; body?: unknown; headers?: Record<string, string>; skipAuth?: boolean;
} = {}): Promise<T> {
  // Reviewer bypass: handle all API calls completely offline without hitting the network
  if (isReviewerToken(memoryAccessToken) || (!options.skipAuth && isReviewerToken(await getStoredRefreshToken().catch(() => null)))) {
    if (!memoryAccessToken) memoryAccessToken = REVIEWER_ACCESS_TOKEN;
    return handleReviewerApiRequest<T>(endpoint, options);
  }

  const version = sessionVersion;
  const headers = { 'Content-Type': 'application/json', ...options.headers } as Record<string, string>;
  const request = () => send(endpoint, { method: options.method || 'GET', headers, body: options.body === undefined ? undefined : JSON.stringify(options.body) });
  try {
    if (!options.skipAuth) headers.Authorization = `Bearer ${memoryAccessToken || await refreshAccessToken()}`;
    let result;
    try { result = await request(); }
    catch (error) {
      if (!isApiError(error) || error.statusCode !== 401 || isMpinRejection(error) || options.skipAuth || version !== sessionVersion) throw error;
      const failedToken = headers.Authorization;
      const token = memoryAccessToken && failedToken !== `Bearer ${memoryAccessToken}` ? memoryAccessToken : await refreshAccessToken();
      headers.Authorization = `Bearer ${token}`;
      result = await request();
    }
    if (!options.skipAuth && version !== sessionVersion) throw new ApiError('Session ended.', 401, 'SESSION_ENDED');
    return result as T;
  } catch (error) {
    if (!options.skipAuth && !isReviewerToken(memoryAccessToken) && version === sessionVersion && isApiError(error) && error.statusCode === 401 && !isMpinRejection(error)) onUnauthorized?.();
    throw error;
  }
}

