// Ví dụ backend dùng sdk/api.ts. Chạy local: hardhat node + deploy --network localhost, rồi
//   $env:CHAIN_NET="localhost"; $env:RPC_URL="http://127.0.0.1:8545"; npx ts-node scripts/demo-api.ts
import "dotenv/config"; // đọc OPERATOR_PRIVATE_KEY từ .env
import * as chain from "../sdk/api";

async function main() {
  // Khóa mặc định của node local: CHỈ dùng khi chạy localhost, tuyệt đối không dùng trên mạng thật.
  if (process.env.CHAIN_NET === "localhost") {
    process.env.OPERATOR_PRIVATE_KEY ??= "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
  }
  const lan = chain.newWallet().address;
  const bao = chain.newWallet().address;
  const shop = chain.newWallet().address;

  await chain.openSeason();
  await chain.giveToken(lan, 1000, "demo:lan:1");
  console.log("token Lan:", await chain.getToken(lan));

  try { await chain.giveToken(lan, 1000, "demo:lan:1"); }
  catch (e: any) { console.log("lỗi:", e.code, "-", e.message); }

  await chain.approveShop(shop);
  const v = await chain.createVoucher({ shop, price: 500, discountPercent: 50, maxSupply: 5 });
  console.log("voucher id:", v.id, "| giá giảm:", await chain.getPrice(v.id, true));

  await chain.buyVoucher(lan, v.id, true);
  console.log("token Lan sau mua:", await chain.getToken(lan));
  await chain.giftVoucher(lan, bao, v.id);
  console.log("ví voucher Bảo:", await chain.listMyVouchers(bao));
  console.log("dùng:", await chain.useVoucher(bao, v.id));
  console.log("phí quán:", await chain.getShopFee(shop));
  console.log("đóng mùa:", (await chain.closeSeason([{ wallet: lan, rankAtEnd: chain.RANK.CAO_THU, bestRank: chain.RANK.CAO_THU }])).season);
  console.log("token Lan cuối mùa:", await chain.getToken(lan), "| huy hiệu:", await chain.getBadge(lan, 1));
}
main().catch((e) => { console.error(e); process.exit(1); });
