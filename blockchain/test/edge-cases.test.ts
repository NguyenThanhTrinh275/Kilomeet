import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

// Các trường hợp biên: phân quyền, tham số sai, lô, đổi cấu hình.
describe("KILOMeet - trường hợp biên", () => {
  async function setup(startSeason = true) {
    const [admin, op, merchant, other, lan, bao, rando] = await ethers.getSigners();
    const token = await (await ethers.getContractFactory("RunToken")).deploy(admin.address, op.address);
    const voucher = await (await ethers.getContractFactory("Voucher")).deploy(admin.address, op.address, await token.getAddress());
    const badge = await (await ethers.getContractFactory("SeasonBadge")).deploy(admin.address, op.address);
    await token.grantRole(await token.BURNER_ROLE(), await voucher.getAddress());
    if (startSeason) await token.connect(op).startSeason();
    await voucher.connect(op).setMerchantApproved(merchant.address, true);
    await voucher.connect(op).setMerchantApproved(other.address, true);
    return { admin, op, merchant, other, lan, bao, rando, token, voucher, badge };
  }
  const id = (s: string) => ethers.keccak256(ethers.toUtf8Bytes(s));
  const noRole = "AccessControlUnauthorizedAccount";

  describe("RunToken", () => {
    it("rewardBatch phát nhiều người; mảng lệch độ dài và id trùng bị từ chối", async () => {
      const { token, op, lan, bao } = await setup();
      await token.connect(op).rewardBatch([lan.address, bao.address], [10, 20], [id("a"), id("b")]);
      expect(await token.balanceOf(lan.address)).to.equal(10);
      expect(await token.balanceOf(bao.address)).to.equal(20);
      await expect(token.connect(op).rewardBatch([lan.address], [1, 2], [id("c")])).to.be.revertedWithCustomError(token, "LengthMismatch");
      await expect(token.connect(op).rewardBatch([lan.address], [1], [id("a")])).to.be.revertedWithCustomError(token, "AlreadyRewarded");
    });
    it("rewardBatch cũng bị chặn khi mùa chưa mở", async () => {
      const { token, op, lan } = await setup(false);
      await expect(token.connect(op).rewardBatch([lan.address], [1], [id("a")])).to.be.revertedWithCustomError(token, "SeasonNotActive");
      await expect(token.connect(op).reward(lan.address, 1, id("a"))).to.be.revertedWithCustomError(token, "SeasonNotActive");
    });
    it("vòng đời mùa: mở hai lần, đóng khi chưa mở, mùa tăng dần", async () => {
      const { token, op } = await setup(false);
      await expect(token.connect(op).endSeason()).to.be.revertedWithCustomError(token, "SeasonNotActive");
      await token.connect(op).startSeason();
      await expect(token.connect(op).startSeason()).to.be.revertedWithCustomError(token, "SeasonStillActive");
      await token.connect(op).endSeason();
      await token.connect(op).startSeason();
      expect(await token.currentSeason()).to.equal(2);
    });
    it("settleSeason: hạng sai, mảng lệch, hạng Bạc cắt còn 100", async () => {
      const { token, op, lan } = await setup();
      await token.connect(op).reward(lan.address, 450, id("a"));
      await token.connect(op).endSeason();
      await expect(token.connect(op).settleSeason([lan.address], [6])).to.be.revertedWithCustomError(token, "BadRank");
      await expect(token.connect(op).settleSeason([lan.address], [])).to.be.revertedWithCustomError(token, "LengthMismatch");
      await token.connect(op).settleSeason([lan.address], [1]);
      expect(await token.balanceOf(lan.address)).to.equal(100);
    });
    it("setRankCap: chỉ admin, hạng sai bị từ chối, giá trị mới có hiệu lực", async () => {
      const { token, op, admin, lan } = await setup();
      await expect(token.connect(op).setRankCap(1, 5)).to.be.revertedWithCustomError(token, noRole);
      await expect(token.connect(admin).setRankCap(6, 5)).to.be.revertedWithCustomError(token, "BadRank");
      await token.connect(admin).setRankCap(1, 50);
      await token.connect(op).reward(lan.address, 80, id("a"));
      await token.connect(op).endSeason();
      await token.connect(op).settleSeason([lan.address], [1]);
      expect(await token.balanceOf(lan.address)).to.equal(50);
    });
    it("phân quyền: người lạ không mở/đóng/chốt mùa; burnForPurchase chỉ cho BURNER", async () => {
      const { token, op, rando, lan } = await setup();
      await expect(token.connect(rando).startSeason()).to.be.revertedWithCustomError(token, noRole);
      await expect(token.connect(rando).endSeason()).to.be.revertedWithCustomError(token, noRole);
      await expect(token.connect(rando).settleSeason([], [])).to.be.revertedWithCustomError(token, noRole);
      await token.connect(op).reward(lan.address, 10, id("a"));
      await expect(token.connect(op).burnForPurchase(lan.address, 5)).to.be.revertedWithCustomError(token, noRole);
      await expect(token.connect(rando).rewardBatch([], [], [])).to.be.revertedWithCustomError(token, noRole);
    });
    it("decimals bằng 0", async () => {
      const { token } = await setup();
      expect(await token.decimals()).to.equal(0);
    });
  });

  describe("Voucher", () => {
    async function withVoucher() {
      const s = await setup();
      await s.voucher.connect(s.merchant).createVoucherType(s.merchant.address, 500, 5000, 5, 0);
      await s.token.connect(s.op).reward(s.lan.address, 3000, id("lan"));
      await s.token.connect(s.op).reward(s.bao.address, 3000, id("bao"));
      return s;
    }

    it("createVoucherType: tham số sai và người lạ bị từ chối", async () => {
      const { voucher, op, merchant, other, rando } = await setup();
      await expect(voucher.connect(op).createVoucherType(merchant.address, 0, 0, 5, 0)).to.be.revertedWithCustomError(voucher, "BadParams");
      await expect(voucher.connect(op).createVoucherType(merchant.address, 10, 0, 0, 0)).to.be.revertedWithCustomError(voucher, "BadParams");
      await expect(voucher.connect(op).createVoucherType(merchant.address, 10, 10001, 5, 0)).to.be.revertedWithCustomError(voucher, "BadParams");
      await expect(voucher.connect(op).createVoucherType(merchant.address, 10, 0, 5, 1)).to.be.revertedWithCustomError(voucher, "BadParams");
      await expect(voucher.connect(other).createVoucherType(merchant.address, 10, 0, 5, 0)).to.be.revertedWithCustomError(voucher, "NotMerchantOrOperator");
      await expect(voucher.connect(rando).setMerchantApproved(rando.address, true)).to.be.revertedWithCustomError(voucher, noRole);
    });
    it("getType, priceOf (làm tròn xuống), loại không tồn tại", async () => {
      const { voucher, op, merchant } = await setup();
      await voucher.connect(op).createVoucherType(merchant.address, 7, 5000, 3, 0);
      const t = await voucher.getType(1);
      expect(t.merchant).to.equal(merchant.address);
      expect(t.basePrice).to.equal(7);
      expect(t.active).to.equal(true);
      expect(await voucher.priceOf(1, false)).to.equal(7);
      expect(await voucher.priceOf(1, true)).to.equal(3);
      await expect(voucher.getType(99)).to.be.revertedWithCustomError(voucher, "UnknownType");
      await expect(voucher.priceOf(99, false)).to.be.revertedWithCustomError(voucher, "UnknownType");
    });
    it("setTypeActive: tắt bán thì không mua được; chỉ cửa hàng/operator được đổi", async () => {
      const { voucher, op, merchant, rando, lan } = await withVoucher();
      await expect(voucher.connect(rando).setTypeActive(1, false)).to.be.revertedWithCustomError(voucher, "NotMerchantOrOperator");
      await voucher.connect(merchant).setTypeActive(1, false);
      await expect(voucher.connect(op).purchase(lan.address, 1, false)).to.be.revertedWithCustomError(voucher, "TypeInactive");
      await voucher.connect(op).setTypeActive(1, true);
      await voucher.connect(op).purchase(lan.address, 1, false);
      expect(await voucher.balanceOf(lan.address, 1)).to.equal(1);
    });
    it("purchase: xin giảm giá khi voucher không có nhiệm vụ; người lạ không mua hộ", async () => {
      const { voucher, op, merchant, rando, lan } = await withVoucher();
      await voucher.connect(op).createVoucherType(merchant.address, 100, 0, 5, 0); // id 2: không giảm giá
      await expect(voucher.connect(op).purchase(lan.address, 2, true)).to.be.revertedWithCustomError(voucher, "DiscountNotAvailable");
      await expect(voucher.connect(rando).purchase(lan.address, 1, false)).to.be.revertedWithCustomError(voucher, noRole);
      await expect(voucher.connect(op).purchase(lan.address, 99, false)).to.be.revertedWithCustomError(voucher, "UnknownType");
    });
    it("giftFor: operator tặng thay; người lạ không được", async () => {
      const { voucher, op, rando, lan, bao } = await withVoucher();
      await voucher.connect(op).purchase(lan.address, 1, false);
      await expect(voucher.connect(rando).giftFor(lan.address, bao.address, 1)).to.be.revertedWithCustomError(voucher, noRole);
      await expect(voucher.connect(op).giftFor(lan.address, bao.address, 1)).to.emit(voucher, "VoucherGifted").withArgs(1, lan.address, bao.address);
      expect(await voucher.balanceOf(bao.address, 1)).to.equal(1);
      expect(await voucher.giftable(lan.address, 1)).to.equal(0);
      expect(await voucher.giftable(bao.address, 1)).to.equal(0);
    });
    it("gift: không tự tặng, không tặng địa chỉ 0, không tặng loại không tồn tại", async () => {
      const { voucher, op, lan } = await withVoucher();
      await voucher.connect(op).purchase(lan.address, 1, false);
      await expect(voucher.connect(lan).gift(lan.address, 1)).to.be.revertedWithCustomError(voucher, "SelfGift");
      await expect(voucher.connect(lan).gift(ethers.ZeroAddress, 1)).to.be.revertedWithCustomError(voucher, "SelfGift");
      await expect(voucher.connect(lan).gift(ethers.Wallet.createRandom().address, 99)).to.be.revertedWithCustomError(voucher, "UnknownType");
    });
    it("gift: voucher hết hạn không tặng được", async () => {
      const { voucher, token, op, merchant, lan, bao } = await setup();
      const exp = (await time.latest()) + 1000;
      await voucher.connect(op).createVoucherType(merchant.address, 10, 0, 5, exp);
      await token.connect(op).reward(lan.address, 100, id("x"));
      await voucher.connect(op).purchase(lan.address, 1, false);
      await time.increaseTo(exp + 10);
      await expect(voucher.connect(lan).gift(bao.address, 1)).to.be.revertedWithCustomError(voucher, "Expired");
    });
    it("không cho ủy quyền hay chuyển hàng loạt", async () => {
      const { voucher, op, lan, bao } = await withVoucher();
      await voucher.connect(op).purchase(lan.address, 1, false);
      await expect(voucher.connect(lan).setApprovalForAll(bao.address, true)).to.be.revertedWithCustomError(voucher, "TransfersDisabled");
      await expect(voucher.connect(lan).safeBatchTransferFrom(lan.address, bao.address, [1], [1], "0x")).to.be.revertedWithCustomError(voucher, "TransfersDisabled");
    });
    it("redeem: quán khác không được quét; operator được; loại không tồn tại", async () => {
      const { voucher, op, other, lan } = await withVoucher();
      await voucher.connect(op).purchase(lan.address, 1, false);
      await expect(voucher.connect(other).redeem(lan.address, 1)).to.be.revertedWithCustomError(voucher, "NotMerchantOrOperator");
      await expect(voucher.connect(op).redeem(lan.address, 99)).to.be.revertedWithCustomError(voucher, "UnknownType");
      await voucher.connect(op).redeem(lan.address, 1);
      expect(await voucher.redeemCount((await voucher.getType(1)).merchant)).to.equal(1);
    });
    it("redeem: giftable luôn ≤ số dư (mua 1 + được tặng 1, dùng cả hai)", async () => {
      const { voucher, op, merchant, lan, bao } = await withVoucher();
      await voucher.connect(op).purchase(lan.address, 1, false);
      await voucher.connect(op).purchase(bao.address, 1, false);
      await voucher.connect(lan).gift(bao.address, 1); // bao: 2 voucher, giftable 1
      expect(await voucher.balanceOf(bao.address, 1)).to.equal(2);
      expect(await voucher.giftable(bao.address, 1)).to.equal(1);
      await voucher.connect(merchant).redeem(bao.address, 1);
      expect(await voucher.giftable(bao.address, 1)).to.equal(1); // còn 1 voucher, vẫn tặng được 1
      await voucher.connect(merchant).redeem(bao.address, 1);
      expect(await voucher.giftable(bao.address, 1)).to.equal(0);
      expect(await voucher.balanceOf(bao.address, 1)).to.equal(0);
    });
    it("setFeePerRedeemVnd: chỉ admin; phí mới áp dụng cho các lượt sau", async () => {
      const { voucher, op, admin, merchant, lan } = await withVoucher();
      await expect(voucher.connect(op).setFeePerRedeemVnd(7000)).to.be.revertedWithCustomError(voucher, noRole);
      await voucher.connect(admin).setFeePerRedeemVnd(7000);
      await voucher.connect(op).purchase(lan.address, 1, false);
      await expect(voucher.connect(merchant).redeem(lan.address, 1)).to.emit(voucher, "VoucherRedeemed").withArgs(1, lan.address, merchant.address, 7000, 1);
      expect(await voucher.feeAccruedVnd(merchant.address)).to.equal(7000);
    });
    it("supportsInterface: ERC-1155 và AccessControl", async () => {
      const { voucher } = await setup();
      expect(await voucher.supportsInterface("0xd9b67a26")).to.equal(true); // ERC-1155
      expect(await voucher.supportsInterface("0x7965db0b")).to.equal(true); // AccessControl
      expect(await voucher.supportsInterface("0xffffffff")).to.equal(false);
    });
    it("discountUsed chỉ ghi nhận cho người đã dùng lượt giảm giá", async () => {
      const { voucher, op, lan, bao } = await withVoucher();
      await voucher.connect(op).purchase(lan.address, 1, true);
      expect(await voucher.discountUsed(lan.address, 1)).to.equal(true);
      expect(await voucher.discountUsed(bao.address, 1)).to.equal(false);
    });
  });

  describe("SeasonBadge", () => {
    it("recordBadges: mint theo lô, nâng hạng, bỏ qua hạng thấp hơn", async () => {
      const { badge, op, lan, bao } = await setup();
      await badge.connect(op).recordBadges([lan.address, bao.address], 1, [2, 4]);
      await badge.connect(op).recordBadges([lan.address, bao.address], 1, [5, 1]); // lan nâng, bao giữ 4
      expect(await badge.rankOf(await badge.badgeOf(lan.address, 1))).to.equal(5);
      expect(await badge.rankOf(await badge.badgeOf(bao.address, 1))).to.equal(4);
      expect(await badge.balanceOf(lan.address)).to.equal(1);
    });
    it("mỗi mùa một huy hiệu riêng, ghi đúng mùa", async () => {
      const { badge, op, lan } = await setup();
      await badge.connect(op).recordBadge(lan.address, 1, 2);
      await badge.connect(op).recordBadge(lan.address, 2, 3);
      expect(await badge.balanceOf(lan.address)).to.equal(2);
      expect(await badge.seasonOf(await badge.badgeOf(lan.address, 2))).to.equal(2);
    });
    it("hạng sai, mảng lệch, người lạ bị từ chối", async () => {
      const { badge, op, rando, lan } = await setup();
      await expect(badge.connect(op).recordBadge(lan.address, 1, 6)).to.be.revertedWithCustomError(badge, "BadRank");
      await expect(badge.connect(op).recordBadges([lan.address], 1, [9])).to.be.revertedWithCustomError(badge, "BadRank");
      await expect(badge.connect(op).recordBadges([lan.address], 1, [])).to.be.revertedWithCustomError(badge, "LengthMismatch");
      await expect(badge.connect(rando).recordBadge(lan.address, 1, 1)).to.be.revertedWithCustomError(badge, noRole);
      await expect(badge.connect(rando).recordBadges([], 1, [])).to.be.revertedWithCustomError(badge, noRole);
    });
    it("supportsInterface: ERC-721 và AccessControl", async () => {
      const { badge } = await setup();
      expect(await badge.supportsInterface("0x80ac58cd")).to.equal(true); // ERC-721
      expect(await badge.supportsInterface("0x7965db0b")).to.equal(true); // AccessControl
    });
  });
});
