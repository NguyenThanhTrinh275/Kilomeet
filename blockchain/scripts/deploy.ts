import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// Deploy 3 hợp đồng, cấp quyền, mở mùa 1, lưu địa chỉ vào deployments/<network>.json
async function main() {
  const [deployer] = await ethers.getSigners();
  const operatorAddr = process.env.OPERATOR_ADDRESS || deployer.address; // ví backend (relayer)
  console.log("Deployer:", deployer.address, "| Operator:", operatorAddr);

  const token = await (await ethers.getContractFactory("RunToken")).deploy(deployer.address, operatorAddr);
  await token.waitForDeployment();
  const voucher = await (await ethers.getContractFactory("Voucher")).deploy(
    deployer.address, operatorAddr, await token.getAddress());
  await voucher.waitForDeployment();
  const badge = await (await ethers.getContractFactory("SeasonBadge")).deploy(deployer.address, operatorAddr);
  await badge.waitForDeployment();

  await (await token.grantRole(await token.BURNER_ROLE(), await voucher.getAddress())).wait();

  const addrs = {
    network: network.name,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    RunToken: await token.getAddress(),
    Voucher: await voucher.getAddress(),
    SeasonBadge: await badge.getAddress(),
    operator: operatorAddr,
  };
  const dir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${network.name}.json`), JSON.stringify(addrs, null, 2));
  console.log(addrs);
  console.log("Lưu ý: gọi startSeason() bằng ví operator để mở mùa 1.");
}
main().catch((e) => { console.error(e); process.exit(1); });
