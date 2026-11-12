// Xuất ABI ra sdk/abi/*.json để backend dùng mà không cần Hardhat.
const fs = require("fs"), path = require("path");
const out = path.join(__dirname, "..", "sdk", "abi");
fs.mkdirSync(out, { recursive: true });
for (const n of ["RunToken", "Voucher", "SeasonBadge"]) {
  const a = require(`../artifacts/contracts/${n}.sol/${n}.json`);
  fs.writeFileSync(path.join(out, `${n}.json`), JSON.stringify(a.abi, null, 2));
  console.log("exported", n);
}
