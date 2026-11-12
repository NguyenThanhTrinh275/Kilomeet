// Hàm/lỗi BE gọi (src/chain/fuji.ts) phải có trong ABI hợp đồng đã deploy (../blockchain/sdk/abi).
// Người phụ trách blockchain đổi giao diện hợp đồng mà quên BE thì test này đỏ.
import { existsSync, readFileSync } from 'node:fs';
import { Interface } from 'ethers';
import { describe, expect, it } from 'vitest';
import { BADGE_ABI, TOKEN_ABI, VOUCHER_ABI } from '../../src/chain/fuji.js';

const dir = new URL('../../../blockchain/sdk/abi/', import.meta.url);
const cases = [['RunToken', TOKEN_ABI], ['Voucher', VOUCHER_ABI], ['SeasonBadge', BADGE_ABI]] as const;

const load = (name: string) => new Interface(JSON.parse(readFileSync(new URL(`${name}.json`, dir), 'utf8')));
const sig = (f: { format: (t: 'sighash') => string; outputs: readonly { type: string }[] }) =>
  `${f.format('sighash')} -> (${f.outputs.map((o) => o.type).join(',')})`;

describe.skipIf(!existsSync(dir))('ABI blockchain/', () => {
  it.each(cases)('%s: mọi hàm và sự kiện BE dùng đều khớp chữ ký', (name, ours) => {
    const real = load(name);
    const missing: string[] = [];
    new Interface(ours as unknown as string[]).forEachFunction((f) => {
      const r = real.getFunction(f.selector);
      if (!r || sig(r) !== sig(f)) missing.push(sig(f));
    });
    new Interface(ours as unknown as string[]).forEachEvent((e) => { if (!real.getEvent(e.topicHash)) missing.push(e.format('sighash')); });
    expect(missing).toEqual([]);
  });

  it('mọi lỗi BE giải mã đều có trong một trong ba hợp đồng (Voucher gọi lồng RunToken)', () => {
    const all = cases.map(([n]) => load(n));
    const missing: string[] = [];
    for (const [, ours] of cases) {
      new Interface(ours as unknown as string[]).forEachError((e) => {
        if (!all.some((i) => i.getError(e.selector))) missing.push(e.format('sighash'));
      });
    }
    expect(missing).toEqual([]);
  });
});
