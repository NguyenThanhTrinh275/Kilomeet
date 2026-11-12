/**
 * api.ts  –  FILE DUY NHẤT backend cần import.
 *
 *   import * as chain from "./sdk/api";
 *   await chain.giveToken(wallet, 10, "daily:user1:2026-11-09");
 *
 * Nghĩ nó như một database có luật:
 *   - Mọi hàm "ghi" trả { txHash, link }  (link mở Snowtrace để show giám khảo)
 *   - Mọi hàm "đọc" trả số / chuỗi / object thường (không có bigint)
 *   - Lỗi: throw ChainError có .code (vd "SoldOut") và .message tiếng Việt
 *
 * Cấu hình bằng biến môi trường (hoặc gọi init() thủ công):
 *   OPERATOR_PRIVATE_KEY  khóa ví backend (bắt buộc)
 *   CHAIN_NET             fuji | avalanche | localhost   (mặc định fuji)
 *   RPC_URL               (mặc định RPC Fuji công khai)
 * Địa chỉ hợp đồng tự đọc từ deployments/<CHAIN_NET>.json
 */
import * as fs from "fs";
import * as path from "path";
import { KilomeetChain, Rank } from "./kilomeet";

// Các con số của game nằm ở config.ts. Backend import từ đây cho tiện:  import { CONFIG } from "./sdk/api"
export { CONFIG, validateConfig } from "./config";

// ───────────────────────── Kiểu dữ liệu ─────────────────────────

export type Wallet = string; // địa chỉ ví "0x..."
export interface Tx { txHash: string; link: string }

/** Hạng: 0 Đồng, 1 Bạc, 2 Vàng, 3 Bạch kim, 4 Kim cương, 5 Cao thủ */
export const RANK = { DONG: 0, BAC: 1, VANG: 2, BACH_KIM: 3, KIM_CUONG: 4, CAO_THU: 5 } as const;

export interface Voucher {
  id: number;
  shop: Wallet;
  price: number;          // giá gốc (token)
  discountPercent: number; // 0-100
  maxSupply: number;
  sold: number;
  expiry: number;         // unix giây, 0 = không hết hạn
  onSale: boolean;
}

// ───────────────────────── Lỗi tiếng Việt ─────────────────────────

const MESSAGES: Record<string, string> = {
  AlreadyRewarded: "Phần thưởng này đã được phát rồi",
  SeasonNotActive: "Mùa chưa mở hoặc đã đóng",
  SeasonStillActive: "Mùa vẫn đang mở, hãy đóng mùa trước",
  MerchantNotApproved: "Cửa hàng chưa được duyệt",
  NotMerchantOrOperator: "Không có quyền thực hiện",
  UnknownType: "Voucher không tồn tại",
  TypeInactive: "Voucher đang tạm ngừng bán",
  Expired: "Voucher đã hết hạn",
  SoldOut: "Voucher đã hết số lượng",
  DiscountNotAvailable: "Voucher này không có giảm giá",
  DiscountAlreadyUsed: "Bạn đã dùng lượt giảm giá của voucher này rồi",
  NotGiftable: "Voucher này không tặng được (đã tặng hoặc là voucher được tặng)",
  SelfGift: "Không thể tự tặng cho chính mình",
  NoVoucher: "Người này không có voucher đó",
  BadParams: "Tham số không hợp lệ",
  ERC20InsufficientBalance: "Không đủ token",
};

export class ChainError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

// ───────────────────────── Khởi tạo ─────────────────────────

let _c: KilomeetChain | undefined;

/** Tự gọi lần đầu dùng. Chỉ cần gọi tay nếu muốn truyền cấu hình riêng. */
export async function init(opts?: { rpcUrl?: string; operatorPrivateKey?: string; net?: string }) {
  const net = opts?.net ?? process.env.CHAIN_NET ?? "fuji";
  const file = path.join(__dirname, "..", "deployments", `${net}.json`);
  if (!fs.existsSync(file)) throw new Error(`Chưa deploy: không thấy ${file}`);
  const addresses = JSON.parse(fs.readFileSync(file, "utf8"));
  const key = opts?.operatorPrivateKey ?? process.env.OPERATOR_PRIVATE_KEY;
  if (!key) throw new Error("Thiếu OPERATOR_PRIVATE_KEY");
  _c = await new KilomeetChain({
    rpcUrl: opts?.rpcUrl ?? process.env.RPC_URL ?? "https://api.avax-test.network/ext/bc/C/rpc",
    operatorPrivateKey: key,
    addresses,
  }).init();
}

async function c(): Promise<KilomeetChain> {
  if (!_c) await init();
  return _c!;
}

/** Bọc mọi lời gọi: đổi lỗi chuỗi thành ChainError dễ hiểu. */
async function run<T>(fn: (k: KilomeetChain) => Promise<T>): Promise<T> {
  try {
    return await fn(await c());
  } catch (e: any) {
    const code = e?.code && typeof e.code === "string" ? e.code : "Unknown";
    throw new ChainError(code, MESSAGES[code] ?? e?.message ?? "Lỗi blockchain");
  }
}

const tx = (r: { txHash: string; explorerUrl?: string }): Tx => ({ txHash: r.txHash, link: r.explorerUrl ?? "" });

// ═════════════════════════ 1. VÍ ═════════════════════════

/** Tạo ví mới. Backend tự lưu privateKey an toàn nếu cần (nếu dùng Privy/thirdweb thì bỏ qua hàm này). */
export function newWallet(): { address: Wallet; privateKey: string } {
  return KilomeetChain.createWallet();
}

/** Gửi ít AVAX để ví mới có gas (chỉ cần trên Fuji, nếu người dùng tự gửi giao dịch). */
export const giveGas = (wallet: Wallet) => run(async (k) => tx(await k.fundGas(wallet)));

// ═════════════════════════ 2. TOKEN ═════════════════════════

/**
 * [CREATE] Phát token cho người chạy khi nhiệm vụ đạt.
 * key phải DUY NHẤT cho mỗi phần thưởng, vd "daily:<userId>:2026-11-09" / "weekly:<userId>:2026-W45".
 * Gọi lại cùng key -> ChainError AlreadyRewarded (coi như đã phát, không sao).
 */
export const giveToken = (wallet: Wallet, amount: number, key: string) =>
  run(async (k) => tx(await k.rewardMission(wallet, amount, key)));

/** [CREATE nhiều] Phát cho nhiều người trong 1 giao dịch. */
export const giveTokenMany = (items: { wallet: Wallet; amount: number; key: string }[]) =>
  run(async (k) => tx(await k.rewardMissionBatch(items.map((i) => ({ to: i.wallet, amount: i.amount, rewardKey: i.key })))));

/** [READ] Số token của ví. */
export const getToken = (wallet: Wallet) => run((k) => k.getTokenBalance(wallet));

/** [READ] Phần thưởng key này đã phát chưa. */
export const wasGiven = (key: string) => run((k) => k.isRewarded(key));

// ═════════════════════════ 3. MÙA ═════════════════════════

/** [READ] { season: 1, active: true } */
export const getSeason = () => run((k) => k.getSeason());

/** Mở mùa mới. */
export const openSeason = () => run(async (k) => tx(await k.startSeason()));

/**
 * Đóng mùa (nút "đóng mùa" của quản trị). Một lệnh làm 3 việc:
 *   dừng phát token -> cắt token vượt mức theo hạng -> ghi huy hiệu mùa.
 * users: MỌI ví còn token. rankAtEnd = hạng lúc hết mùa (trước khi tụt 2 bậc), bestRank = hạng cao nhất mùa.
 * Việc tụt 2 bậc trong DB do backend tự làm.
 */
export const closeSeason = (users: { wallet: Wallet; rankAtEnd: number; bestRank: number }[]) =>
  run(async (k) => {
    const r = await k.closeSeason(
      users.map((u) => ({ address: u.wallet, rankAtEnd: u.rankAtEnd as Rank, bestRank: u.bestRank as Rank })),
    );
    return { season: r.season, txs: r.txs.map(tx) };
  });

/** [READ] Huy hiệu mùa của ví: { rank } hoặc null nếu chưa có. */
export const getBadge = (wallet: Wallet, season: number) =>
  run(async (k) => {
    const b = await k.getBadge(wallet, season);
    return b ? { rank: b.rank as number } : null;
  });

// ═════════════════════════ 4. CỬA HÀNG & VOUCHER ═════════════════════════

/** Duyệt cửa hàng (quản trị). */
export const approveShop = (shop: Wallet) => run(async (k) => tx(await k.approveMerchant(shop, true)));

/**
 * [CREATE] Tạo voucher cho cửa hàng. Trả id -> LƯU id này vào DB của backend.
 * discountPercent: dùng mức có tên trong config, vd CONFIG.voucher.discount.MEDIUM (50) hoặc .HIGH (90).
 * Không truyền = không có nhiệm vụ voucher. Mức giảm ghi cố định lúc tạo, không đổi được sau đó.
 */
export const createVoucher = (p: {
  shop: Wallet; price: number; discountPercent?: number; maxSupply: number; expiry?: Date | number;
}) =>
  run(async (k) => {
    const r = await k.createVoucherType({
      merchant: p.shop, basePrice: p.price, discountPercent: p.discountPercent ?? 0,
      maxSupply: p.maxSupply, expiry: p.expiry,
    });
    return { id: Number(r.typeId), ...tx(r) };
  });

/** [READ] Thông tin 1 voucher. */
export const getVoucher = (id: number): Promise<Voucher> =>
  run(async (k) => {
    const t = await k.getVoucherType(id);
    return {
      id, shop: t.merchant, price: t.basePrice, discountPercent: t.discountBps / 100,
      maxSupply: t.maxSupply, sold: t.sold, expiry: t.expiry, onSale: t.active,
    };
  });

/** [READ] Danh sách TẤT CẢ voucher trên chuỗi (dùng cho màn "voucher gần mình"; sau này backend nên lọc theo khu vực). */
export const listVouchers = (): Promise<Voucher[]> =>
  run(async (k) => {
    const next = Number(await k.voucher.nextTypeId());
    const out: Voucher[] = [];
    for (let id = 1; id < next; id++) out.push(await getVoucher(id));
    return out;
  });

/** [UPDATE] Bật/tắt bán voucher. */
export const setVoucherOnSale = (id: number, onSale: boolean) =>
  run(async (k) => tx(await k.setVoucherActive(id, onSale)));

/** [READ] Giá phải trả (token): withDiscount=true khi người chạy đã làm xong nhiệm vụ voucher. */
export const getPrice = (id: number, withDiscount: boolean) => run((k) => k.priceOf(id, withDiscount));

/**
 * Người chạy MUA voucher (đốt token).
 * Backend kiểm TRƯỚC: hạng tối thiểu, khu vực, nhiệm vụ GPS (<50m), còn trong 7 ngày.
 * Chuỗi tự chặn: hết hàng, hết hạn, giảm giá lần 2, thiếu token.
 */
export const buyVoucher = (wallet: Wallet, id: number, withDiscount: boolean) =>
  run(async (k) => tx(await k.purchaseVoucher(wallet, id, withDiscount)));

/** TẶNG voucher đã mua cho người khác (chỉ 1 lần; người nhận không tặng tiếp). */
export const giftVoucher = (from: Wallet, to: Wallet, id: number) =>
  run(async (k) => tx(await k.giftVoucher(from, to, id)));

/** DÙNG voucher: cửa hàng quét QR -> voucher bị đốt, phí 5.000đ được ghi sổ. */
export const useVoucher = (holder: Wallet, id: number) =>
  run(async (k) => {
    const r = await k.redeemVoucher(holder, id);
    return { feeVnd: Number(r.feeVnd), ...tx(r) };
  });

/** [READ] Ví voucher của người chạy: [{ id, amount }] */
export const listMyVouchers = (wallet: Wallet) =>
  run(async (k) => (await k.getWalletVouchers(wallet)).map((v) => ({ id: Number(v.typeId), amount: v.amount })));

/** [READ] Người này có bao nhiêu voucher loại id. */
export const countVoucher = (wallet: Wallet, id: number) => run((k) => k.getVoucherBalance(wallet, id));

/** [READ] Còn tặng được mấy voucher loại id. */
export const countGiftable = (wallet: Wallet, id: number) => run((k) => k.getGiftable(wallet, id));

/** [READ] Đã dùng lượt giảm giá của voucher này chưa. */
export const usedDiscount = (wallet: Wallet, id: number) => run((k) => k.hasUsedDiscount(wallet, id));

// ═════════════════════════ 5. PHÍ CỬA HÀNG ═════════════════════════

/** [READ] Tổng lượt dùng + phí (đồng) đã ghi sổ của 1 cửa hàng. */
export const getShopFee = (shop: Wallet) =>
  run(async (k) => {
    const r = await k.getMerchantFee(shop);
    return { uses: r.redeemCount, feeVnd: Number(r.feeVnd) };
  });

/** [READ] Lịch sử các lượt dùng voucher của cửa hàng (để đối chiếu trước khi trả phí). */
export const getShopUses = (shop: Wallet) =>
  run(async (k) =>
    (await k.getRedeemEvents({ merchant: shop })).map((e) => ({
      voucherId: Number(e.typeId), holder: e.holder, feeVnd: Number(e.feeVnd), txHash: e.txHash,
    })),
  );
