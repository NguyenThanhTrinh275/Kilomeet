// Đối chiếu số dư token DB với on-chain (hợp đồng trong ../blockchain).
//   pnpm chain:check      (địa chỉ lấy từ .env hoặc CHAIN_DEPLOYMENT, mặc định ../blockchain/deployments/fuji.json)
import { Contract, JsonRpcProvider } from 'ethers';
import { BADGE_ABI, TOKEN_ABI, chainAddresses } from '../src/chain/fuji.js';
import { config } from '../src/lib/config.js';
import { prisma } from '../src/lib/prisma.js';

const a = chainAddresses();
const provider = new JsonRpcProvider(config.FUJI_RPC_URL);
const token = new Contract(a.RunToken, TOKEN_ABI, provider);
const badge = new Contract(a.SeasonBadge, BADGE_ABI, provider);

console.log(`RunToken ${a.RunToken} · mùa on-chain ${await token.getFunction('currentSeason')()} (${(await token.getFunction('seasonActive')()) ? 'đang mở' : 'đang đóng'})`);
const pending = await prisma.chainOutbox.count({ where: { status: { in: ['pending', 'sent'] } } });
const failed = await prisma.chainOutbox.findMany({ where: { status: 'failed' }, select: { op: true, lastError: true } });
console.log(`Outbox: ${pending} đang chờ, ${failed.length} lỗi`);
for (const f of failed.slice(0, 5)) console.log(`  ✗ ${f.op}: ${f.lastError}`);
const types = await prisma.voucherTemplate.count({ where: { chainTokenId: null } });
if (types) console.log(`${types} mẫu voucher chưa có loại on-chain`);
console.log('');

let mismatch = 0;
for (const u of await prisma.user.findMany({ where: { runner: { isNot: null } }, include: { runner: true }, orderBy: { walletIndex: 'asc' } })) {
  const onChain = Number(await token.getFunction('balanceOf')(u.walletAddress));
  const badges = Number(await badge.getFunction('balanceOf')(u.walletAddress));
  const ok = onChain >= u.runner!.tokenBalance ? '✓' : '✗';
  if (ok === '✗') mismatch++;
  console.log(`${ok} ${u.email.padEnd(18)} DB ${String(u.runner!.tokenBalance).padStart(5)} · chain ${String(onChain).padStart(5)} · huy hiệu ${badges}`);
}
console.log(mismatch ? `\n${mismatch} tài khoản lệch (chain < DB)` : '\nKhớp. (chain có thể > DB nếu đã demo:reset trên cùng hợp đồng)');
await prisma.$disconnect();
