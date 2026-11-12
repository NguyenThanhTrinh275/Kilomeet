// KILOMeet — API Client
// EXPO_PUBLIC_API_URL rỗng → dùng mock. Có giá trị (vd. http://192.168.1.26:3000) → gọi BE thật.

import type { ApiResponse } from './types';
import { mockGet, mockPost, mockPut, mockDelete } from './mock/router';

const OFFLINE_MESSAGE = 'Không kết nối được máy chủ';

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
  try {
    const res = await fetch(`${baseUrl}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    json = (await res.json()) as ApiResponse<T>;
  } catch {
    // Mất mạng, sai IP, hoặc server trả về thứ không phải JSON.
    throw new Error(OFFLINE_MESSAGE);
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
