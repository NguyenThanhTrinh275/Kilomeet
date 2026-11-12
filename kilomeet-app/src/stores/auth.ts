// Zustand — Auth store
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AnyUser, UserRole, AuthResponse } from '../api/types';
import { api } from '../api/client';

const TOKEN_KEY = 'authToken';

/** Đăng ký cửa hàng: gửi thêm role + thông tin quán (chờ admin duyệt). */
export interface RegisterExtra {
  role?: 'runner' | 'store';
  storeName?: string;
  storeAddress?: string;
  latitude?: number;
  longitude?: number;
}

async function saveSession(token: string): Promise<void> {
  api.setToken(token);
  await AsyncStorage.setItem(TOKEN_KEY, token).catch(() => undefined);
}

interface AuthState {
  user: AnyUser | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  register: (email: string, name: string, password: string, extra?: RegisterExtra) => Promise<void>;
  logout: () => void;
  /** Mở app: đọc token đã lưu, gọi /auth/me. Trả true nếu khôi phục được phiên. */
  restoreSession: () => Promise<boolean>;
  /** Lấy lại user mới nhất từ BE (số dư token, hạng, km tuần). */
  refreshMe: () => Promise<void>;
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
      await saveSession(res.token);
      set({ user: res.user, token: res.token, isLoading: false });
    } catch (e) {
      set({ isLoading: false, error: (e as Error).message });
      throw e;
    }
  },

  register: async (email, name, password, extra) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post<AuthResponse>('/auth/register', { email, name, password, ...extra });
      await saveSession(res.token);
      set({ user: res.user, token: res.token, isLoading: false });
    } catch (e) {
      set({ isLoading: false, error: (e as Error).message });
      throw e;
    }
  },

  logout: () => {
    api.setToken(null);
    AsyncStorage.removeItem(TOKEN_KEY).catch(() => undefined);
    set({ user: null, token: null, error: null });
  },

  restoreSession: async () => {
    // Chế độ mock không có phiên theo token.
    if (api.isMock()) return false;
    const token = await AsyncStorage.getItem(TOKEN_KEY).catch(() => null);
    if (!token) return false;
    api.setToken(token);
    try {
      const user = await api.get<AnyUser>('/auth/me');
      set({ user, token });
      return true;
    } catch (e) {
      // Token hết hạn / không hợp lệ thì xoá; mất mạng thì giữ token để lần sau thử lại.
      if ((e as Error).message !== 'Không kết nối được máy chủ') {
        api.setToken(null);
        await AsyncStorage.removeItem(TOKEN_KEY).catch(() => undefined);
      }
      return false;
    }
  },

  refreshMe: async () => {
    const user = await api.get<AnyUser>('/auth/me');
    set({ user });
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
