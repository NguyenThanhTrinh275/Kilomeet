// Mock — ví phí trả trước của cửa hàng (quyết định #28). Giữ trạng thái trong bộ nhớ.
import type { StoreFeeEntry, StoreFeeSummary, StoreFeeWallet } from '../types';
import { getCurrentUserId, MOCK_STORE } from './data';

export const MOCK_FEE_VND = 3000;

const state = {
  balanceVnd: 150_000,
  heldVnd: 3_000,
  heldCount: 1,
  totalPaidVnd: 141_000,
  unsoldCount: 73,
  entries: [
    { id: 'fe-3', kind: 'hold', title: 'Tạm giữ phí', subtitle: '«Giảm 20% toàn menu» vừa bán · Trần Minh', amountVnd: 3000, balanceDeltaVnd: 0, heldDeltaVnd: 3000, createdAt: '2026-11-18T02:10:00Z' },
    { id: 'fe-2', kind: 'charge', title: 'Trừ phí lượt quét', subtitle: 'Quét «Giảm 20% toàn menu» của Nguyễn Lan', amountVnd: 3000, balanceDeltaVnd: -3000, heldDeltaVnd: -3000, createdAt: '2026-11-17T09:12:00Z' },
    { id: 'fe-1', kind: 'topup', title: 'Nạp tiền vào ví phí', subtitle: 'Thanh toán giả lập', amountVnd: 153_000, balanceDeltaVnd: 153_000, heldDeltaVnd: 0, createdAt: '2026-11-16T13:15:00Z' },
  ] as StoreFeeEntry[],
};
const seenRequests = new Set<string>();

function guard() {
  if (getCurrentUserId() !== MOCK_STORE.id) throw new Error('Không phải tài khoản cửa hàng');
}

export function mockFeeSummary(): StoreFeeSummary {
  const availableVnd = Math.max(0, state.balanceVnd - state.heldVnd);
  return {
    balanceVnd: state.balanceVnd,
    heldVnd: state.heldVnd,
    availableVnd,
    feePerVoucherVnd: MOCK_FEE_VND,
    sellableCount: Math.floor(availableVnd / MOCK_FEE_VND),
    unsoldCount: state.unsoldCount,
    shortfallVnd: Math.max(0, state.unsoldCount * MOCK_FEE_VND - availableVnd),
  };
}

export function mockGetFeeWallet(): StoreFeeWallet {
  guard();
  return {
    ...mockFeeSummary(),
    heldCount: state.heldCount,
    totalPaidVnd: state.totalPaidVnd,
    presetsVnd: [30_000, 60_000, 150_000, 300_000],
    entries: state.entries,
  };
}

export function mockTopupFee(body: unknown): StoreFeeWallet {
  guard();
  const { amountVnd, requestId } = (body ?? {}) as { amountVnd?: number; requestId?: string };
  const amount = Number(amountVnd);
  if (!Number.isInteger(amount) || amount <= 0) throw new Error('Số tiền nạp không hợp lệ');
  if (amount < 10_000) throw new Error('Nạp tối thiểu 10.000đ');
  if (amount > 10_000_000) throw new Error('Nạp tối đa 10.000.000đ mỗi lần');
  if (requestId && seenRequests.has(requestId)) return mockGetFeeWallet();
  if (requestId) seenRequests.add(requestId);
  state.balanceVnd += amount;
  state.entries.unshift({
    id: `fe-${Date.now()}`, kind: 'topup', title: 'Nạp tiền vào ví phí', subtitle: 'Thanh toán giả lập',
    amountVnd: amount, balanceDeltaVnd: amount, heldDeltaVnd: 0, createdAt: new Date().toISOString(),
  });
  return mockGetFeeWallet();
}

/** Quét QR trong mock: trừ khoản đang giữ (hoặc phí hiện hành). */
export function mockChargeFee(title: string) {
  const held = state.heldCount > 0 ? MOCK_FEE_VND : 0;
  state.balanceVnd -= MOCK_FEE_VND;
  state.heldVnd -= held;
  state.heldCount -= held ? 1 : 0;
  state.totalPaidVnd += MOCK_FEE_VND;
  state.entries.unshift({
    id: `fe-${Date.now()}`, kind: 'charge', title: 'Trừ phí lượt quét', subtitle: `Quét «${title}»`,
    amountVnd: MOCK_FEE_VND, balanceDeltaVnd: -MOCK_FEE_VND, heldDeltaVnd: -held, createdAt: new Date().toISOString(),
  });
  return MOCK_FEE_VND;
}
