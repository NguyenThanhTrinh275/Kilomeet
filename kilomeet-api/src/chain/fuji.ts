import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Contract, JsonRpcProvider, Wallet, keccak256, toUtf8Bytes, type ContractTransactionResponse, type Log } from 'ethers';
import { config } from '../lib/config.js';
import { ChainRetryLater, ChainTxUnknown, type ChainGateway, type RecoverResult, type ResolvedOp, type SendResult } from './gateway.js';

// Chỉ các hàm/lỗi BE dùng, khớp ABI trong ../blockchain/sdk/abi (test/contract/chain-abi.test.ts kiểm tra).
export const TOKEN_ABI = [
  'function OPERATOR_ROLE() view returns (bytes32)',
  'function hasRole(bytes32 role, address account) view returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
  'function seasonActive() view returns (bool)',
  'function currentSeason() view returns (uint256)',
  'function rewarded(bytes32 rewardId) view returns (bool)',
  'function reward(address to, uint256 amount, bytes32 rewardId)',
  'function startSeason() returns (uint256)',
  'function endSeason()',
  'function settleSeason(address[] users, uint8[] ranks)',
  'error AlreadyRewarded(bytes32 rewardId)',
  'error SeasonNotActive()',
  'error SeasonStillActive()',
  'error NonTransferable()',
  'error BadRank(uint8 rank)',
  'error ERC20InsufficientBalance(address sender, uint256 balance, uint256 needed)',
  'error AccessControlUnauthorizedAccount(address account, bytes32 neededRole)',
];
export const VOUCHER_ABI = [
  'function approvedMerchant(address merchant) view returns (bool)',
  'function balanceOf(address account, uint256 id) view returns (uint256)',
  'function setMerchantApproved(address merchant, bool approved)',
  'function createVoucherType(address merchant, uint32 basePrice, uint16 discountBps, uint32 maxSupply, uint64 expiry) returns (uint256 typeId)',
  'function purchase(address buyer, uint256 typeId, bool applyDiscount)',
  'function giftFor(address from, address to, uint256 typeId)',
  'function redeem(address holder, uint256 typeId)',
  'event VoucherTypeCreated(uint256 indexed typeId, address indexed merchant, uint32 basePrice, uint16 discountBps, uint32 maxSupply, uint64 expiry)',
  'error MerchantNotApproved()',
  'error NotMerchantOrOperator()',
  'error UnknownType()',
  'error TypeInactive()',
  'error Expired()',
  'error SoldOut()',
  'error DiscountNotAvailable()',
  'error DiscountAlreadyUsed()',
  'error NotGiftable()',
  'error SelfGift()',
  'error NoVoucher()',
  'error BadParams()',
  'error ERC20InsufficientBalance(address sender, uint256 balance, uint256 needed)',
  'error AccessControlUnauthorizedAccount(address account, bytes32 neededRole)',
];
export const BADGE_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function badgeOf(address user, uint256 season) view returns (uint256)',
  'function recordBadge(address user, uint256 season, uint8 rank)',
  'error BadRank(uint8 rank)',
  'error AccessControlUnauthorizedAccount(address account, bytes32 neededRole)',
];

export interface ChainAddresses { RunToken: string; Voucher: string; SeasonBadge: string; operator?: string }

/** Địa chỉ hợp đồng: biến môi trường nếu có, không thì đọc file deployments của ../blockchain. */
export function chainAddresses(): ChainAddresses {
  if (config.RUN_TOKEN_ADDRESS && config.VOUCHER_ADDRESS && config.BADGE_ADDRESS) {
    return { RunToken: config.RUN_TOKEN_ADDRESS, Voucher: config.VOUCHER_ADDRESS, SeasonBadge: config.BADGE_ADDRESS };
  }
  const file = resolve(config.CHAIN_DEPLOYMENT);
  if (!existsSync(file)) {
    throw new Error(`CHAIN=fuji cần địa chỉ hợp đồng: đặt RUN_TOKEN_ADDRESS/VOUCHER_ADDRESS/BADGE_ADDRESS hoặc CHAIN_DEPLOYMENT (không thấy ${file})`);
  }
  return JSON.parse(readFileSync(file, 'utf8')) as ChainAddresses;
}

/** Tên lỗi Solidity (custom error) nếu giao dịch bị revert. */
function revertName(e: unknown): string | null {
  const r = (e as { revert?: { name?: string } }).revert;
  return r?.name ?? null;
}

const rewardId = (key: string) => keccak256(toUtf8Bytes(key));

/**
 * Gửi giao dịch thật lên Avalanche Fuji (hoặc node EVM bất kỳ theo FUJI_RPC_URL) bằng ví server (OPERATOR).
 * Chỉ job chain-outbox gọi, tuần tự từng giao dịch, chờ receipt rồi mới gửi tiếp
 * (nên không cần NonceManager: provider tự lấy nonce kế tiếp).
 * Trước mỗi lệnh đọc trạng thái chain để gọi lại (retry) không làm hai lần.
 */
export class FujiChain implements ChainGateway {
  readonly name = 'fuji' as const;
  private readonly signer: Wallet;
  private readonly token: Contract;
  private readonly voucher: Contract;
  private readonly badge: Contract;
  private roleChecked = false;
  private onBroadcast: ((txHash: string) => Promise<void>) | undefined;

  constructor() {
    const key = config.SERVER_PRIVATE_KEY || config.OPERATOR_PRIVATE_KEY;
    if (!key) throw new Error('CHAIN=fuji cần SERVER_PRIVATE_KEY (khoá ví operator, xin người phụ trách blockchain)');
    const a = chainAddresses();
    const provider = new JsonRpcProvider(config.FUJI_RPC_URL);
    this.signer = new Wallet(key, provider);
    this.token = new Contract(a.RunToken, TOKEN_ABI, this.signer);
    this.voucher = new Contract(a.Voucher, VOUCHER_ABI, this.signer);
    this.badge = new Contract(a.SeasonBadge, BADGE_ABI, this.signer);
  }

  async send(op: ResolvedOp, onBroadcast?: (txHash: string) => Promise<void>): Promise<SendResult> {
    await this.checkRole();
    this.onBroadcast = onBroadcast;
    try {
      return await this.dispatch(op);
    } catch (e) {
      if (e instanceof ChainRetryLater || e instanceof ChainTxUnknown) throw e;
      const name = revertName(e);
      if (name === 'SeasonNotActive') throw new ChainRetryLater('Mùa on-chain đang đóng, chờ mở mùa');
      throw new Error(name ? `${op.op} bị từ chối: ${name}` : String((e as Error).message ?? e));
    } finally {
      this.onBroadcast = undefined;
    }
  }

  /** Tra receipt của giao dịch đã phát. Chưa thấy trên mạng (bị bỏ khỏi mempool) → failed = gửi lại an toàn. */
  async recover(op: ResolvedOp, txHash: string): Promise<RecoverResult> {
    const provider = this.signer.provider!;
    const receipt = await provider.getTransactionReceipt(txHash);
    if (receipt) {
      if (receipt.status !== 1) return { state: 'failed' };
      return { state: 'done', result: op.op === 'createVoucherType' ? { txHash, typeId: this.typeIdFromLogs(receipt.logs, txHash) } : { txHash } };
    }
    return (await provider.getTransaction(txHash)) ? { state: 'unknown' } : { state: 'failed' };
  }

  private typeIdFromLogs(logs: readonly Log[], txHash: string): number {
    for (const log of logs) {
      const parsed = this.voucher.interface.parseLog(log);
      if (parsed?.name === 'VoucherTypeCreated') return Number(parsed.args[0]);
    }
    throw new Error(`Không thấy sự kiện VoucherTypeCreated trong ${txHash}`);
  }

  /**
   * Chờ receipt. Đã lên mạng thì báo `onBroadcast` để lưu txHash trước khi chờ.
   * Revert sau khi lên mạng → lỗi thường (gửi lại an toàn). Lỗi khác lúc chờ (timeout, mất RPC) → ChainTxUnknown.
   */
  private async waitMined(tx: ContractTransactionResponse, notify: boolean) {
    if (notify) await this.onBroadcast?.(tx.hash);
    try {
      const receipt = await tx.wait(1, 120_000);
      if (!receipt || receipt.status !== 1) throw new Error(`Giao dịch thất bại: ${tx.hash}`);
      return receipt;
    } catch (e) {
      if ((e as { code?: string }).code === 'CALL_EXCEPTION') throw new Error(`Giao dịch bị revert: ${tx.hash}`);
      if (e instanceof Error && e.message.startsWith('Giao dịch thất bại')) throw e;
      throw new ChainTxUnknown(`Chưa rõ kết quả ${tx.hash}: ${(e as Error).message ?? e}`);
    }
  }

  private async checkRole() {
    if (this.roleChecked) return;
    const role = await this.token.getFunction('OPERATOR_ROLE')();
    if (!(await this.token.getFunction('hasRole')(role, this.signer.address))) {
      throw new Error(`Ví ${this.signer.address} không có quyền OPERATOR trên RunToken — kiểm tra SERVER_PRIVATE_KEY`);
    }
    this.roleChecked = true;
  }

  private async mined(p: Promise<ContractTransactionResponse>): Promise<SendResult> {
    const tx = await p;
    await this.waitMined(tx, true);
    return { txHash: tx.hash };
  }

  private typeIdOf(op: ResolvedOp): number {
    if (op.typeId === undefined) throw new ChainRetryLater('Loại voucher chưa được tạo on-chain');
    return op.typeId;
  }

  private async dispatch(op: ResolvedOp): Promise<SendResult> {
    const t = (n: string) => this.token.getFunction(n);
    const v = (n: string) => this.voucher.getFunction(n);
    switch (op.op) {
      case 'mintToken': {
        const id = rewardId(op.key);
        if (await t('rewarded')(id)) return { txHash: null };
        if (!(await t('seasonActive')())) throw new ChainRetryLater('Mùa on-chain đang đóng, chờ mở mùa');
        return this.mined(t('reward')(op.to, op.amount, id));
      }
      case 'approveMerchant':
        if ((await v('approvedMerchant')(op.merchant)) === op.approved) return { txHash: null };
        return this.mined(v('setMerchantApproved')(op.merchant, op.approved));
      case 'createVoucherType': {
        // Duyệt quán trước (idempotent: đọc trạng thái trước khi gửi), không lưu hash của giao dịch phụ này.
        if (!(await v('approvedMerchant')(op.merchant))) await this.waitMined(await v('setMerchantApproved')(op.merchant, true), false);
        const tx: ContractTransactionResponse = await v('createVoucherType')(op.merchant, op.price, op.discountBps, op.maxSupply, op.expiry);
        const receipt = await this.waitMined(tx, true);
        return { txHash: tx.hash, typeId: this.typeIdFromLogs(receipt.logs, tx.hash) };
      }
      case 'purchaseVoucher':
        return this.mined(v('purchase')(op.to, this.typeIdOf(op), op.discounted));
      case 'giftVoucher':
        return this.mined(v('giftFor')(op.from, op.to, this.typeIdOf(op)));
      case 'redeemVoucher':
        return this.mined(v('redeem')(op.from, this.typeIdOf(op)));
      case 'startSeason':
        if (await t('seasonActive')()) return { txHash: null };
        return this.mined(t('startSeason')());
      case 'endSeason':
        if (!(await t('seasonActive')())) return { txHash: null };
        return this.mined(t('endSeason')());
      case 'settleSeason':
        return this.mined(t('settleSeason')([op.from], [op.rankIdx]));
      case 'recordBadge':
        return this.mined(this.badge.getFunction('recordBadge')(op.to, op.season, op.rankIdx));
    }
  }
}
