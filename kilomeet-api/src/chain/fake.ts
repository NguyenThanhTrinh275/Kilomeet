import { randomBytes } from 'node:crypto';
import type { ChainGateway, RecoverResult, ResolvedOp, SendResult } from './gateway.js';

/** Không gọi mạng; ghi lại các lệnh để test kiểm tra. */
export class FakeChain implements ChainGateway {
  readonly name = 'fake' as const;
  readonly sent: ResolvedOp[] = [];
  private nextTypeId = 1;

  async send(op: ResolvedOp, onBroadcast?: (txHash: string) => Promise<void>): Promise<SendResult> {
    this.sent.push(op);
    const txHash = `0x${randomBytes(32).toString('hex')}`;
    await onBroadcast?.(txHash);
    return op.op === 'createVoucherType' ? { txHash, typeId: this.nextTypeId++ } : { txHash };
  }

  /** Giao dịch giả luôn coi là đã xong. */
  async recover(op: ResolvedOp, txHash: string): Promise<RecoverResult> {
    return { state: 'done', result: op.op === 'createVoucherType' ? { txHash, typeId: this.nextTypeId++ } : { txHash } };
  }
}
