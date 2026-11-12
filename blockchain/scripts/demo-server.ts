/**
 * Trang demo trực quan (CHỈ chạy trên máy bạn, KHÔNG dùng làm server thật).
 *   npm run demo:ui   rồi mở http://localhost:3000
 * Nó dùng ví server (OPERATOR_PRIVATE_KEY trong .env) để phát token / mua / dùng voucher giúp địa chỉ bạn nhập,
 * và hiện số liệu đọc thẳng từ Avalanche Fuji.
 */
import "dotenv/config";
import * as http from "http";
import * as fs from "fs";
import * as path from "path";
import { Wallet, isAddress } from "ethers";
import * as chain from "../sdk/api";

process.env.CHAIN_NET ??= "fuji";
const PORT = Number(process.env.PORT ?? 3000);
const opAddr = new Wallet(process.env.OPERATOR_PRIVATE_KEY!).address;
const deploy = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "deployments", `${process.env.CHAIN_NET}.json`), "utf8"));
const EXPLORER = process.env.CHAIN_NET === "avalanche" ? "https://snowtrace.io" : "https://testnet.snowtrace.io";

async function ensureSetup() {
  const s = await chain.getSeason();
  if (!s.active) { console.log("Mở mùa mới..."); await chain.openSeason(); }
  const vs = await chain.listVouchers();
  if (!vs.some((v) => v.shop.toLowerCase() === opAddr.toLowerCase())) {
    console.log("Tạo voucher demo...");
    await chain.approveShop(opAddr);
    await chain.createVoucher({ shop: opAddr, price: 100, discountPercent: chain.CONFIG.voucher.discount.MEDIUM, maxSupply: 50 });
  }
}

async function state(addr: string) {
  const [season, vouchers] = await Promise.all([chain.getSeason(), chain.listVouchers()]);
  const mine = addr ? await chain.listMyVouchers(addr) : [];
  const token = addr ? await chain.getToken(addr) : 0;
  const list = await Promise.all(
    vouchers.map(async (v) => ({
      ...v,
      discountedPrice: v.discountPercent > 0 ? await chain.getPrice(v.id, true) : null,
      holding: mine.find((m) => m.id === v.id)?.amount ?? 0,
    })),
  );
  return { season, token, vouchers: list, contracts: deploy, explorer: EXPLORER, shop: opAddr };
}

function send(res: http.ServerResponse, code: number, body: unknown, type = "application/json") {
  res.writeHead(code, { "content-type": type + "; charset=utf-8" });
  res.end(type === "application/json" ? JSON.stringify(body) : String(body));
}
const readBody = (req: http.IncomingMessage) =>
  new Promise<any>((ok, no) => {
    let s = "";
    req.on("data", (c) => (s += c));
    req.on("end", () => { try { ok(s ? JSON.parse(s) : {}); } catch (e) { no(e); } });
  });

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", "http://localhost");
    if (req.method === "GET" && url.pathname === "/") {
      return send(res, 200, fs.readFileSync(path.join(__dirname, "demo.html"), "utf8"), "text/html");
    }
    if (req.method === "GET" && url.pathname === "/api/state") {
      const addr = url.searchParams.get("addr") ?? "";
      if (addr && !isAddress(addr)) return send(res, 400, { error: "Địa chỉ ví không hợp lệ" });
      return send(res, 200, await state(addr));
    }
    if (req.method === "POST" && url.pathname.startsWith("/api/")) {
      const b = await readBody(req);
      if (!isAddress(b.addr)) return send(res, 400, { error: "Địa chỉ ví không hợp lệ" });
      let tx: any;
      if (url.pathname === "/api/give") {
        tx = await chain.giveToken(b.addr, 100, `demo-ui:${b.addr}:${Date.now()}`);
      } else if (url.pathname === "/api/buy") {
        tx = await chain.buyVoucher(b.addr, Number(b.id), !!b.discount);
      } else if (url.pathname === "/api/use") {
        tx = await chain.useVoucher(b.addr, Number(b.id));
      } else return send(res, 404, { error: "Không có endpoint này" });
      return send(res, 200, { ok: true, tx });
    }
    send(res, 404, { error: "Không tìm thấy" });
  } catch (e: any) {
    send(res, 400, { error: e?.message ?? "Lỗi" });
  }
});

ensureSetup()
  .then(() => server.listen(PORT, "127.0.0.1", () => console.log(`Mở trình duyệt: http://localhost:${PORT}`)))
  .catch((e) => { console.error(e); process.exit(1); });
