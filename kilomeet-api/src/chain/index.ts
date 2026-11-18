import { config } from '../lib/config.js';
import { FakeChain } from './fake.js';
import type { ChainGateway } from './gateway.js';

let chain: ChainGateway | null = null;

/** Gateway dùng chung cho job chain-outbox. CHAIN=fuji cần biến môi trường của FujiChain. */
export async function getChain(): Promise<ChainGateway> {
  if (chain) return chain;
  if (config.CHAIN === 'fuji') {
    const { FujiChain } = await import('./fuji.js');
    chain = new FujiChain();
  } else {
    chain = new FakeChain();
  }
  return chain;
}

/** Test: thay gateway (vd. FakeChain để đọc lệnh đã gửi). */
export function setChain(c: ChainGateway | null): void {
  chain = c;
}

export { ChainRetryLater, ChainTxUnknown } from './gateway.js';
export type { BatchOp, ChainGateway, ChainOp, RecoverResult, ResolvedOp, SendResult } from './gateway.js';
