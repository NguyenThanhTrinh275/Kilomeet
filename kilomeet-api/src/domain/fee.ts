// Ví phí trả trước của cửa hàng (quyết định #28).
// - Quán nạp tiền vào ví phí. Phát hành voucher không tốn gì.
// - Người chạy mua 1 voucher → tạm giữ FEE trong ví quán. Không đủ khả dụng → voucher "Tạm hết".
// - Quán quét QR → trừ thật khoản đang giữ. Voucher hết hạn chưa dùng → trả lại khoản giữ.
// Khả dụng = số dư − tạm giữ. Mọi voucher đã bán đều có sẵn phí đứng sau, nên nền tảng không bị nợ.

/** Phí nền tảng mỗi lượt voucher được dùng (VND). */
export const VOUCHER_FEE_VND = 3000;

/** Nạp tối thiểu / tối đa mỗi lần (VND). */
export const TOPUP_MIN_VND = 10_000;
export const TOPUP_MAX_VND = 10_000_000;

/** Các mức nạp nhanh gợi ý trên app. */
export const TOPUP_PRESETS_VND = [30_000, 60_000, 150_000, 300_000] as const;

export interface FeeWallet {
  balanceVnd: number;
  heldVnd: number;
}

export const availableVnd = (w: FeeWallet) => Math.max(0, w.balanceVnd - w.heldVnd);

/** Số voucher còn bán được nhờ ví phí. */
export const sellableByFee = (w: FeeWallet, fee = VOUCHER_FEE_VND) => Math.floor(availableVnd(w) / fee);

/** Có đủ khả dụng để giữ phí cho 1 voucher nữa không. */
export const canHold = (w: FeeWallet, fee = VOUCHER_FEE_VND) => availableVnd(w) >= fee;

/** Số tiền cần nạp thêm để bán hết `unsold` voucher còn lại. */
export const shortfallVnd = (w: FeeWallet, unsold: number, fee = VOUCHER_FEE_VND) =>
  Math.max(0, unsold * fee - availableVnd(w));

/** Trả message lỗi tiếng Việt nếu số tiền nạp không hợp lệ. */
export function topupError(amountVnd: number): string | null {
  if (!Number.isInteger(amountVnd) || amountVnd <= 0) return 'Số tiền nạp không hợp lệ';
  if (amountVnd < TOPUP_MIN_VND) return 'Nạp tối thiểu 10.000đ';
  if (amountVnd > TOPUP_MAX_VND) return 'Nạp tối đa 10.000.000đ mỗi lần';
  if (amountVnd % 1000 !== 0) return 'Số tiền nạp phải là bội số của 1.000đ';
  return null;
}
