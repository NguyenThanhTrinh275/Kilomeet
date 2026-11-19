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

// ✓ bằng nhau · ~ chain nhiều hơn ≤ 1 token/lượt mua giảm giá (chain làm tròn giá xuống, BE Math.round) · ✗ lệch thật
let mismatch = 0;
let drift = 0;
for (const u of await prisma.user.findMany({ where: { runner: { isNot: null } }, include: { runner: true }, orderBy: { walletIndex: 'asc' } })) {
  const onChain = Number(await token.getFunction('balanceOf')(u.walletAddress));
  const badges = Number(await badge.getFunction('balanceOf')(u.walletAddress));
  const db = u.runner!.tokenBalance;
  const discounted = await prisma.ownedVoucher.count({ where: { buyerId: u.id, discounted: true } });
  const mark = onChain === db ? '✓' : onChain > db && onChain - db <= discounted ? '~' : '✗';
  if (mark === '✗') mismatch++;
  if (mark === '~') drift++;
  console.log(`${mark} ${u.email.padEnd(18)} DB ${String(db).padStart(5)} · chain ${String(onChain).padStart(5)} · huy hiệu ${badges}`);
}
if (pending) console.log(`\n${pending} lệnh chưa gửi: số dư chain có thể chưa cập nhật, chạy lại sau.`);
console.log(mismatch ? `\n✗ ${mismatch} tài khoản lệch` : drift ? `\nKhớp (${drift} tài khoản lệch ≤ 1 token do làm tròn giá giảm)` : '\nKhớp hoàn toàn.');
await prisma.$disconnect();
