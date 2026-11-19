// Đặt phí mỗi lượt dùng voucher ghi trong event VoucherRedeemed trên chain cho khớp BE (quyết định #28: 3.000đ).
//   pnpm chain:set-fee        (cần CHAIN=fuji, SERVER_PRIVATE_KEY là ví admin của hợp đồng Voucher)
import { Contract, JsonRpcProvider, Wallet } from 'ethers';
import { chainAddresses } from '../src/chain/fuji.js';
import { VOUCHER_FEE_VND } from '../src/domain/fee.js';
import { config } from '../src/lib/config.js';

const key = config.SERVER_PRIVATE_KEY || config.OPERATOR_PRIVATE_KEY;
if (!key) throw new Error('Thiếu SERVER_PRIVATE_KEY');
const provider = new JsonRpcProvider(config.FUJI_RPC_URL, undefined, { cacheTimeout: -1 });
const voucher = new Contract(
  chainAddresses().Voucher,
  ['function feePerRedeemVnd() view returns (uint256)', 'function setFeePerRedeemVnd(uint256 feeVnd)'],
  new Wallet(key, provider),
);
const current = Number(await voucher.getFunction('feePerRedeemVnd')());
if (current === VOUCHER_FEE_VND) {
  console.log(`Phí on-chain đã là ${current}đ, không cần đổi.`);
} else {
  const tx = await voucher.getFunction('setFeePerRedeemVnd')(VOUCHER_FEE_VND);
  console.log(`Đổi phí ${current}đ → ${VOUCHER_FEE_VND}đ: ${tx.hash}`);
  await tx.wait();
  console.log(`Xong: https://testnet.snowtrace.io/tx/${tx.hash}`);
}
