// Zustand — Auth store
import { create } from 'zustand';
import type { AnyUser, UserRole, AuthResponse } from '../api/types';
import { api } from '../api/client';

interface AuthState {
  user: AnyUser | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  register: (email: string, name: string, password: string) => Promise<void>;
  logout: () => void;
  /** Route path based on user role */
  getHomeRoute: () => string;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post<AuthResponse>('/auth/login', { email, password });
      set({ user: res.user, token: res.token, isLoading: false });
    } catch (e) {
      set({ isLoading: false, error: (e as Error).message });
      throw e;
    }
  },

  register: async (email, name, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post<AuthResponse>('/auth/register', { email, name, password });
      set({ user: res.user, token: res.token, isLoading: false });
    } catch (e) {
      set({ isLoading: false, error: (e as Error).message });
      throw e;
    }
  },

  logout: () => {
    set({ user: null, token: null, error: null });
  },

  getHomeRoute: () => {
    const role = get().user?.role;
    const routes: Record<UserRole, string> = {
      runner: '/(runner)',
      member: '/(runner)',
      store: '/(store)',
      admin: '/(admin)',
    };
    return routes[role ?? 'runner'];
  },
}));
