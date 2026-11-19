// KILOMeet — API Client
// EXPO_PUBLIC_API_URL rỗng → dùng mock. Có giá trị (vd. http://192.168.1.26:3000) → gọi BE thật.

import type { ApiResponse } from './types';
import { toast } from 'sonner-native';
import { mockGet, mockPost, mockPut, mockDelete } from './mock/router';

const OFFLINE_MESSAGE = 'Không kết nối được máy chủ';
/** Mất Wi-Fi mà còn 4G thì request tới IP LAN treo vài phút → tự huỷ sau 12 giây để không quay mãi. */
const REQUEST_TIMEOUT_MS = 12_000;
let lastOfflineToast = 0;
/** Báo mất kết nối dùng chung (nhiều màn tải nền bỏ qua lỗi), tối đa 1 lần / 10 giây. */
function notifyOffline() {
  const now = Date.now();
  if (now - lastOfflineToast < 10_000) return;
  lastOfflineToast = now;
  toast.error(OFFLINE_MESSAGE, { description: 'Kiểm tra Wi-Fi hoặc 4G rồi thử lại.' });
}

let baseUrl = (process.env.EXPO_PUBLIC_API_URL ?? '').trim().replace(/\/+$/, '');
let authToken: string | null = null;

async function mockDelay(): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>();
  setTimeout(resolve, 300 + Math.random() * 200);
  return promise;
}

async function realFetch<T>(method: string, endpoint: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  let json: ApiResponse<T>;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${baseUrl}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
    json = (await res.json()) as ApiResponse<T>;
  } catch {
    // Mất mạng, sai IP, quá thời gian chờ, hoặc server trả về thứ không phải JSON.
    notifyOffline();
    throw new Error(OFFLINE_MESSAGE);
  } finally {
    clearTimeout(timer);
  }
  if (!json.success) throw new Error(json.message ?? 'Có lỗi xảy ra');
  return json.data;
}

export const api = {
  get: async <T>(endpoint: string, params?: Record<string, string>): Promise<T> => {
    if (!baseUrl) {
      await mockDelay();
      return mockGet<T>(endpoint, params);
    }
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return realFetch<T>('GET', endpoint + qs);
  },

  post: async <T>(endpoint: string, body?: unknown): Promise<T> => {
    if (!baseUrl) {
      await mockDelay();
      return mockPost<T>(endpoint, body);
    }
    return realFetch<T>('POST', endpoint, body);
  },

  put: async <T>(endpoint: string, body?: unknown): Promise<T> => {
    if (!baseUrl) {
      await mockDelay();
      return mockPut<T>(endpoint, body);
    }
    return realFetch<T>('PUT', endpoint, body);
  },

  delete: async <T>(endpoint: string): Promise<T> => {
    if (!baseUrl) {
      await mockDelay();
      return mockDelete<T>(endpoint);
    }
    return realFetch<T>('DELETE', endpoint);
  },

  setBaseUrl: (url: string) => {
    baseUrl = url.trim().replace(/\/+$/, '');
  },

  /** JWT gửi kèm mọi request tới BE thật (`Authorization: Bearer`). */
  setToken: (token: string | null) => {
    authToken = token;
  },

  isMock: () => !baseUrl,
};
