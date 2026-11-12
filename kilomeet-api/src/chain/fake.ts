import { randomBytes } from 'node:crypto';
import type { ChainGateway, ResolvedOp, SendResult } from './gateway.js';

/** Không gọi mạng; ghi lại các lệnh để test kiểm tra. */
export class FakeChain implements ChainGateway {
  readonly name = 'fake' as const;
  readonly sent: ResolvedOp[] = [];
  private nextTypeId = 1;

  async send(op: ResolvedOp): Promise<SendResult> {
    this.sent.push(op);
    const txHash = `0x${randomBytes(32).toString('hex')}`;
    return op.op === 'createVoucherType' ? { txHash, typeId: this.nextTypeId++ } : { txHash };
  }
}
