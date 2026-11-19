/**
 * kilomeet.ts  –  lớp nói chuyện với 3 hợp đồng (ethers v6). sdk/api.ts bọc lớp này thành hàm đơn giản.
 *
 * - Ví operator (server) ký mọi giao dịch, trả gas thay người dùng.
 * - Giao dịch gửi tuần tự qua NonceManager nên gọi song song an toàn trong MỘT tiến trình.
 * - Lỗi revert được đổi thành Error có `.code` = tên custom error của Solidity (vd "SoldOut"),
 *   api.ts dịch `.code` sang câu tiếng Việt.
 */
import {
  Contract, Interface, JsonRpcProvider, NonceManager, Wallet, keccak256, parseEther, toUtf8Bytes,
  type ContractTransactionReceipt, type ContractTransactionResponse, type InterfaceAbi,
} from "ethers";
import RunTokenAbi from "./abi/RunToken.json";
import VoucherAbi from "./abi/Voucher.json";
import SeasonBadgeAbi from "./abi/SeasonBadge.json";

/** 0 Đồng, 1 Bạc, 2 Vàng, 3 Bạch kim, 4 Kim cương, 5 Cao thủ */
export type Rank = 0 | 1 | 2 | 3 | 4 | 5;

export interface Addresses { RunToken: string; Voucher: string; SeasonBadge: string; chainId?: number }
export interface TxResult { txHash: string; explorerUrl: string }

const EXPLORER: Record<number, string> = {
  43113: "https://testnet.snowtrace.io",
  43114: "https://snowtrace.io",
};

/** Mọi lỗi custom của 3 hợp đồng (kể cả lỗi ERC20 nổi lên từ RunToken khi Voucher.purchase đốt token). */
const ERRORS = new Interface([
  ...(RunTokenAbi as InterfaceAbi as any[]),
  ...(VoucherAbi as InterfaceAbi as any[]),
  ...(SeasonBadgeAbi as InterfaceAbi as any[]),
].filter((f: any) => f.type === "error"));

class ChainCallError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

/** Tìm data revert trong lỗi ethers (nằm ở các độ sâu khác nhau tuỳ provider). */
function revertData(e: any): string | null {
  for (const d of [e?.data, e?.error?.data, e?.info?.error?.data, e?.error?.error?.data]) {
    if (typeof d === "string" && d.startsWith("0x") && d.length >= 10) return d;
    if (typeof d?.data === "string") return d.data;
  }
  return null;
}

function toChainError(e: any): Error {
  if (e instanceof ChainCallError) return e;
  const name = e?.revert?.name ?? (() => {
    const data = revertData(e);
    if (!data) return null;
    try { return ERRORS.parseError(data)?.name ?? null; } catch { return null; }
  })();
  if (name) return new ChainCallError(name, `${name}`);
  return new ChainCallError(typeof e?.code === "string" ? e.code : "Unknown", e?.shortMessage ?? e?.message ?? String(e));
}

const rewardIdOf = (key: string) => keccak256(toUtf8Bytes(key));
const toUnix = (d?: Date | number) => (d === undefined ? 0 : d instanceof Date ? Math.floor(d.getTime() / 1000) : Math.floor(d));

export class KilomeetChain {
  readonly provider: JsonRpcProvider;
  readonly signer: NonceManager;
  readonly token: Contract;
  readonly voucher: Contract;
  readonly badge: Contract;
  private chainId = 0;

  constructor(opts: { rpcUrl: string; operatorPrivateKey: string; addresses: Addresses }) {
    this.provider = new JsonRpcProvider(opts.rpcUrl);
    this.signer = new NonceManager(new Wallet(opts.operatorPrivateKey, this.provider));
    this.token = new Contract(opts.addresses.RunToken, RunTokenAbi as InterfaceAbi, this.signer);
    this.voucher = new Contract(opts.addresses.Voucher, VoucherAbi as InterfaceAbi, this.signer);
    this.badge = new Contract(opts.addresses.SeasonBadge, SeasonBadgeAbi as InterfaceAbi, this.signer);
  }

  /** Đọc chainId và kiểm ví có quyền OPERATOR. */
  async init(): Promise<this> {
    this.chainId = Number((await this.provider.getNetwork()).chainId);
    const me = await this.signer.getAddress();
    if (!(await this.token.hasRole(await this.token.OPERATOR_ROLE(), me))) {
      throw new ChainCallError("NotOperator", `Ví ${me} không có quyền OPERATOR trên RunToken`);
    }
    return this;
  }

  static createWallet(): { address: string; privateKey: string } {
    const w = Wallet.createRandom();
    return { address: w.address, privateKey: w.privateKey };
  }

  private link(hash: string): string {
    const base = EXPLORER[this.chainId];
    return base ? `${base}/tx/${hash}` : "";
  }

  /** Gửi giao dịch, chờ 1 xác nhận, đổi lỗi revert thành `.code`. */
  private async send(p: () => Promise<ContractTransactionResponse>): Promise<TxResult & { receipt: ContractTransactionReceipt }> {
    try {
      const tx = await p();
      const receipt = await tx.wait(1);
      if (!receipt || receipt.status !== 1) throw new ChainCallError("TxFailed", `Giao dịch thất bại: ${tx.hash}`);
      return { txHash: tx.hash, explorerUrl: this.link(tx.hash), receipt };
    } catch (e) {
      this.signer.reset(); // nonce có thể đã lệch sau lỗi
      throw toChainError(e);
    }
  }

  private async read<T>(p: () => Promise<T>): Promise<T> {
    try {
      return await p();
    } catch (e) {
      throw toChainError(e);
    }
  }

  private static strip({ txHash, explorerUrl }: TxResult): TxResult {
    return { txHash, explorerUrl };
  }

  // ───────────── Ví ─────────────

  async fundGas(wallet: string, amountAvax = "0.01"): Promise<TxResult> {
    try {
      const tx = await this.signer.sendTransaction({ to: wallet, value: parseEther(amountAvax) });
      await tx.wait(1);
      return { txHash: tx.hash, explorerUrl: this.link(tx.hash) };
    } catch (e) {
      this.signer.reset();
      throw toChainError(e);
    }
  }

  // ───────────── Token ─────────────

  async rewardMission(to: string, amount: number, rewardKey: string): Promise<TxResult> {
    return KilomeetChain.strip(await this.send(() => this.token.reward(to, amount, rewardIdOf(rewardKey))));
  }

  async rewardMissionBatch(items: { to: string; amount: number; rewardKey: string }[]): Promise<TxResult> {
    return KilomeetChain.strip(
      await this.send(() => this.token.rewardBatch(items.map((i) => i.to), items.map((i) => i.amount), items.map((i) => rewardIdOf(i.rewardKey)))),
    );
  }

  getTokenBalance = (wallet: string) => this.read(async () => Number(await this.token.balanceOf(wallet)));
  isRewarded = (rewardKey: string) => this.read(async () => Boolean(await this.token.rewarded(rewardIdOf(rewardKey))));

  // ───────────── Mùa & huy hiệu ─────────────

  getSeason = () =>
    this.read(async () => ({ season: Number(await this.token.currentSeason()), active: Boolean(await this.token.seasonActive()) }));

  async startSeason(): Promise<TxResult> {
    return KilomeetChain.strip(await this.send(() => this.token.startSeason()));
  }

  /** endSeason (nếu đang mở) → settleSeason theo lô → recordBadges theo lô (chỉ ví có bestRank > Đồng). */
  async closeSeason(users: { address: string; rankAtEnd: Rank; bestRank: Rank }[]): Promise<{ season: number; txs: TxResult[] }> {
    const txs: TxResult[] = [];
    const { season, active } = await this.getSeason();
    if (active) txs.push(KilomeetChain.strip(await this.send(() => this.token.endSeason())));
    const BATCH = 100;
    for (let i = 0; i < users.length; i += BATCH) {
      const part = users.slice(i, i + BATCH);
      txs.push(KilomeetChain.strip(await this.send(() => this.token.settleSeason(part.map((u) => u.address), part.map((u) => u.rankAtEnd)))));
    }
    const ranked = users.filter((u) => u.bestRank > 0);
    for (let i = 0; i < ranked.length; i += BATCH) {
      const part = ranked.slice(i, i + BATCH);
      txs.push(KilomeetChain.strip(await this.send(() => this.badge.recordBadges(part.map((u) => u.address), season, part.map((u) => u.bestRank)))));
    }
    return { season, txs };
  }

  getBadge = (wallet: string, season: number) =>
    this.read(async () => {
      const id = await this.badge.badgeOf(wallet, season);
      return id === 0n ? null : { tokenId: Number(id), rank: Number(await this.badge.rankOf(id)) };
    });

  // ───────────── Cửa hàng & voucher ─────────────

  async approveMerchant(merchant: string, approved: boolean): Promise<TxResult> {
    return KilomeetChain.strip(await this.send(() => this.voucher.setMerchantApproved(merchant, approved)));
  }

  async createVoucherType(p: {
    merchant: string; basePrice: number; discountPercent: number; maxSupply: number; expiry?: Date | number;
  }): Promise<TxResult & { typeId: number }> {
    const bps = Math.round(p.discountPercent * 100);
    const r = await this.send(() => this.voucher.createVoucherType(p.merchant, p.basePrice, bps, p.maxSupply, toUnix(p.expiry)));
    for (const log of r.receipt.logs) {
      const parsed = this.voucher.interface.parseLog(log);
      if (parsed?.name === "VoucherTypeCreated") return { ...KilomeetChain.strip(r), typeId: Number(parsed.args[0]) };
    }
    throw new ChainCallError("NoEvent", `Không thấy sự kiện VoucherTypeCreated trong ${r.txHash}`);
  }

  getVoucherType = (typeId: number) =>
    this.read(async () => {
      const t = await this.voucher.getType(typeId);
      return {
        merchant: String(t.merchant), basePrice: Number(t.basePrice), discountBps: Number(t.discountBps),
        maxSupply: Number(t.maxSupply), sold: Number(t.sold), expiry: Number(t.expiry), active: Boolean(t.active),
      };
    });

  async setVoucherActive(typeId: number, active: boolean): Promise<TxResult> {
    return KilomeetChain.strip(await this.send(() => this.voucher.setTypeActive(typeId, active)));
  }

  priceOf = (typeId: number, withDiscount: boolean) => this.read(async () => Number(await this.voucher.priceOf(typeId, withDiscount)));

  async purchaseVoucher(buyer: string, typeId: number, withDiscount: boolean): Promise<TxResult> {
    return KilomeetChain.strip(await this.send(() => this.voucher.purchase(buyer, typeId, withDiscount)));
  }

  async giftVoucher(from: string, to: string, typeId: number): Promise<TxResult> {
    return KilomeetChain.strip(await this.send(() => this.voucher.giftFor(from, to, typeId)));
  }

  async redeemVoucher(holder: string, typeId: number): Promise<TxResult & { feeVnd: bigint }> {
    const r = await this.send(() => this.voucher.redeem(holder, typeId));
    for (const log of r.receipt.logs) {
      const parsed = this.voucher.interface.parseLog(log);
      if (parsed?.name === "VoucherRedeemed") return { ...KilomeetChain.strip(r), feeVnd: BigInt(parsed.args.feeVnd) };
    }
    return { ...KilomeetChain.strip(r), feeVnd: BigInt(await this.voucher.feePerRedeemVnd()) };
  }

  /** Mọi loại voucher ví đang giữ (duyệt id 1..nextTypeId-1). */
  getWalletVouchers = (wallet: string) =>
    this.read(async () => {
      const next = Number(await this.voucher.nextTypeId());
      const out: { typeId: number; amount: number }[] = [];
      for (let id = 1; id < next; id++) {
        const amount = Number(await this.voucher.balanceOf(wallet, id));
        if (amount > 0) out.push({ typeId: id, amount });
      }
      return out;
    });

  getVoucherBalance = (wallet: string, typeId: number) => this.read(async () => Number(await this.voucher.balanceOf(wallet, typeId)));
  getGiftable = (wallet: string, typeId: number) => this.read(async () => Number(await this.voucher.giftable(wallet, typeId)));
  hasUsedDiscount = (wallet: string, typeId: number) => this.read(async () => Boolean(await this.voucher.discountUsed(wallet, typeId)));

  // ───────────── Phí cửa hàng ─────────────

  getMerchantFee = (merchant: string) =>
    this.read(async () => ({
      redeemCount: Number(await this.voucher.redeemCount(merchant)),
      feeVnd: BigInt(await this.voucher.feeAccruedVnd(merchant)),
    }));

  /**
   * Các lượt dùng voucher của cửa hàng (sự kiện VoucherRedeemed).
   * RPC công khai giới hạn khoảng block mỗi lần đọc log → đọc lùi theo từng đoạn, mặc định ~20.000 block gần nhất.
   */
  getRedeemEvents = (p: { merchant: string; lookbackBlocks?: number; step?: number }) =>
    this.read(async () => {
      const latest = await this.provider.getBlockNumber();
      const step = p.step ?? 2000;
      const from = Math.max(0, latest - (p.lookbackBlocks ?? 20_000));
      const filter = this.voucher.filters.VoucherRedeemed(null, null, p.merchant);
      const out: { typeId: number; holder: string; feeVnd: bigint; txHash: string }[] = [];
      for (let start = from; start <= latest; start += step) {
        const logs = await this.voucher.queryFilter(filter, start, Math.min(latest, start + step - 1));
        for (const l of logs) {
          const parsed = this.voucher.interface.parseLog(l);
          if (!parsed) continue;
          out.push({ typeId: Number(parsed.args.typeId), holder: String(parsed.args.holder), feeVnd: BigInt(parsed.args.feeVnd), txHash: l.transactionHash });
        }
      }
      return out;
    });
}
