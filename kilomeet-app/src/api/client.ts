// KILOMeet — API Client
// Currently routes to mock handlers. Swap to real backend with api.setBaseUrl().

import type { ApiResponse } from './types';
import { mockGet, mockPost, mockPut, mockDelete } from './mock/router';

let baseUrl = '';

async function mockDelay(): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>();
  setTimeout(resolve, 300 + Math.random() * 200);
  return promise;
}

async function realFetch<T>(method: string, endpoint: string, body?: unknown): Promise<T> {
  const res = await fetch(`${baseUrl}${endpoint}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json()) as ApiResponse<T>;
  if (!json.success) throw new Error(json.message ?? 'API error');
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
    baseUrl = url;
  },
};
