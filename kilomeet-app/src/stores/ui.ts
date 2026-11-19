// Zustand — trạng thái giao diện dùng chung (ẩn thanh tab khi đang chạy...).
import { create } from 'zustand';

interface UiState {
  hideTabBar: boolean;
  setHideTabBar: (hide: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  hideTabBar: false,
  setHideTabBar: (hideTabBar) => set({ hideTabBar }),
}));
