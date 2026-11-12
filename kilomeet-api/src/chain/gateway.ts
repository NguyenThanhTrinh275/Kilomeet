// Chain đứng sau interface này. DB là nguồn sự thật; service chỉ ghi chain_outbox,
// job chain-outbox mới gọi gateway. Test luôn dùng FakeChain.
// Các lệnh khớp hợp đồng trong ../blockchain (RunToken, Voucher, SeasonBadge).
// Quy ước field: `to` = ví nhận, `from` = ví bị trừ (để /me/wallet lọc giao dịch theo ví).

export type ChainOp =
  /** RunToken.reward — `key` duy nhất cho mỗi phần thưởng (chain chặn phát trùng). */
  | { op: 'mintToken'; to: string; amount: number; key: string }
  /** Voucher.setMerchantApproved */
  | { op: 'approveMerchant'; merchant: string; approved: boolean }
  /** Voucher.createVoucherType — typeId do chain cấp, job lưu vào voucher_templates.chain_token_id. */
  | { op: 'createVoucherType'; templateId: string; merchant: string; price: number; discountBps: number; maxSupply: number; expiry: number }
  /** Voucher.purchase — chain tự đốt token của người mua. */
  | { op: 'purchaseVoucher'; to: string; templateId: string; discounted: boolean }
  /** Voucher.giftFor */
  | { op: 'giftVoucher'; from: string; to: string; templateId: string }
  /** Voucher.redeem */
  | { op: 'redeemVoucher'; from: string; templateId: string }
  /** RunToken.startSeason / endSeason */
  | { op: 'startSeason' }
  | { op: 'endSeason' }
  /** RunToken.settleSeason — giữ tối đa rankCap[hạng lúc hết mùa], phần vượt bị đốt. */
  | { op: 'settleSeason'; from: string; rankIdx: number }
  /** SeasonBadge.recordBadge */
  | { op: 'recordBadge'; to: string; season: number; rankIdx: number };

/** Lệnh đã được job bổ sung `typeId` (id loại voucher on-chain) nếu lệnh có templateId. */
export type ResolvedOp = ChainOp & { typeId?: number };

export interface SendResult {
  /** null khi chain đã ở đúng trạng thái nên không cần gửi giao dịch (vd. phần thưởng đã phát). */
  txHash: string | null;
  /** createVoucherType: id loại voucher chain vừa cấp. */
  typeId?: number;
}

/** Chưa gửi được lúc này nhưng không phải lỗi (vd. mùa on-chain đang đóng): giữ pending, không tính lần thử. */
export class ChainRetryLater extends Error {}

export interface ChainGateway {
  readonly name: 'fake' | 'fuji';
  send(op: ResolvedOp): Promise<SendResult>;
}
