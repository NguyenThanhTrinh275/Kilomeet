// Đồng bộ các giá trị [on-chain] trong sdk/config.ts lên hợp đồng (chỉ gửi giao dịch cho giá trị nào đang khác).
//   npm run config:apply            (mặc định Fuji)
// Cần ví ADMIN (DEPLOYER_PRIVATE_KEY trong .env).
import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { CONFIG, validateConfig } from "../sdk/config";

async function main() {
  validateConfig();
  const file = path.join(__dirname, "..", "deployments", `${network.name}.json`);
  const d = JSON.parse(fs.readFileSync(file, "utf8"));
  const token = await ethers.getContractAt("RunToken", d.RunToken);
  const voucher = await ethers.getContractAt("Voucher", d.Voucher);
  let changes = 0;

  const caps = CONFIG.ranks.keepTokensAtSeasonEnd;
  for (let rank = 0; rank < caps.length; rank++) {
    const now = await token.rankCap(rank);
    if (now !== BigInt(caps[rank])) {
      console.log(`Hạng ${CONFIG.ranks.names[rank]}: giữ tối đa ${now} -> ${caps[rank]} token`);
      await (await token.setRankCap(rank, caps[rank])).wait();
      changes++;
    }
  }

  const fee = await voucher.feePerRedeemVnd();
  if (fee !== BigInt(CONFIG.voucher.feePerUseVnd)) {
    console.log(`Phí mỗi lượt dùng: ${fee} -> ${CONFIG.voucher.feePerUseVnd} đồng`);
    await (await voucher.setFeePerRedeemVnd(CONFIG.voucher.feePerUseVnd)).wait();
    changes++;
  }

  console.log(changes ? `Đã cập nhật ${changes} giá trị lên chuỗi.` : "Config đã khớp với chuỗi, không cần cập nhật.");
}
main().catch((e) => { console.error(e); process.exit(1); });
