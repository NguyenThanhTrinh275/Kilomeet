// Zustand — Voucher store
import { create } from 'zustand';
import type { VoucherTemplate, OwnedVoucher } from '../api/types';
import { api } from '../api/client';

interface VoucherState {
  templates: VoucherTemplate[];
  myVouchers: OwnedVoucher[];
  isLoading: boolean;

  fetchTemplates: (storeId?: string) => Promise<void>;
  fetchMyVouchers: () => Promise<void>;
  buyVoucher: (templateId: string, questCompleted?: boolean) => Promise<OwnedVoucher>;
  giftVoucher: (voucherId: string, toUserId: string) => Promise<void>;
}

export const useVoucherStore = create<VoucherState>((set) => ({
  templates: [],
  myVouchers: [],
  isLoading: false,

  fetchTemplates: async (storeId) => {
    set({ isLoading: true });
    const params = storeId ? { storeId } : undefined;
    const templates = await api.get<VoucherTemplate[]>('/vouchers', params);
    set({ templates, isLoading: false });
  },

  fetchMyVouchers: async () => {
    set({ isLoading: true });
    const myVouchers = await api.get<OwnedVoucher[]>('/vouchers/mine');
    set({ myVouchers, isLoading: false });
  },

  buyVoucher: async (templateId, questCompleted) => {
    const voucher = await api.post<OwnedVoucher>('/vouchers/buy', { templateId, questCompleted });
    set((s) => ({
      myVouchers: [...s.myVouchers, voucher],
      templates: s.templates.map((t) =>
        t.id === templateId ? { ...t, remaining: t.remaining - 1 } : t
      ),
    }));
    return voucher;
  },

  giftVoucher: async (voucherId, toUserId) => {
    await api.post<OwnedVoucher>('/vouchers/gift', { voucherId, toUserId });
    set((s) => ({
      myVouchers: s.myVouchers.filter((v) => v.id !== voucherId),
    }));
  },
}));
