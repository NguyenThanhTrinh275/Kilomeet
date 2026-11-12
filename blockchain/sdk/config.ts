/**
 * config.ts  –  NƠI DUY NHẤT chứa các con số của game. Muốn đổi luật chơi thì sửa ở đây.
 *
 * Cách dùng ở backend:
 *   import { CONFIG } from "./sdk/config";
 *   await chain.giveToken(wallet, CONFIG.missions.dailyReward, key);
 *   await chain.createVoucher({ ..., discountPercent: CONFIG.voucher.discount.MEDIUM });
 *
 * Có 2 loại số:
 *   [backend]  chỉ backend đọc khi gọi hàm -> sửa file là có hiệu lực ngay.
 *   [on-chain] đang được ghi trên hợp đồng -> sửa file xong phải chạy:  npm run config:apply
 *
 * Giá trị dưới đây lấy từ tài liệu ý tưởng của nhóm; chỉnh thoải mái.
 */
export const CONFIG = {
  // ───────── Nhiệm vụ & token kiếm được ─────────
  missions: {
    dailyMinKm: 2,            // [backend] chạy tối thiểu mấy km thì đạt nhiệm vụ ngày
    dailyReward: 10,          // [backend] token cho nhiệm vụ ngày
    weeklyRewardPerKm: 7,     // [backend] token cho mỗi km của nhiệm vụ tuần
    weeklyGoalGrowth: 0.1,    // [backend] mục tiêu tuần = trung bình 4 tuần gần nhất cộng 10%
    weeklyGoalWeeks: 4,       // [backend] số tuần dùng để tính trung bình
  },

  // ───────── Hạng (thứ tự: Đồng, Bạc, Vàng, Bạch kim, Kim cương, Cao thủ) ─────────
  ranks: {
    names: ["Đồng", "Bạc", "Vàng", "Bạch kim", "Kim cương", "Cao thủ"],
    minKmPerWeek: [0, 5, 10, 15, 25, 40],              // [backend] km/tuần cần để đạt hạng đó
    keepTokensAtSeasonEnd: [0, 100, 200, 300, 400, 500], // [on-chain] token giữ lại tối đa khi hết mùa
    fastPromoteWeeks: 3,      // [backend] chạy đủ mấy tuần liền thì lên nhanh
    dropRanksAtSeasonEnd: 2,  // [backend] cuối mùa tụt mấy bậc
    exemptWeeksPerSeason: 1,  // [backend] số tuần được miễn tụt hạng mỗi mùa
  },

  // ───────── Mùa ─────────
  season: {
    monthsPerSeason: 4,       // [backend]
    remindSpendDaysBeforeEnd: 7, // [backend] nhắc tiêu token trước khi hết mùa mấy ngày
  },

  // ───────── Voucher ─────────
  voucher: {
    // Các mức giảm có tên. Khi tạo voucher chọn một mức: discountPercent: CONFIG.voucher.discount.MEDIUM
    // LƯU Ý: mức giảm được ghi cố định lúc tạo voucher, voucher đã tạo không đổi được.
    discount: {
      NONE: 0,                // không có nhiệm vụ voucher
      LOW: 20,
      MEDIUM: 50,
      HIGH: 90,
    },
    discountWindowDays: 7,    // [backend] có bao nhiêu ngày để mua giá giảm sau khi làm xong nhiệm vụ
    passByRadiusMeters: 50,   // [backend] chạy ngang quán trong bao nhiêu mét thì tính là xong nhiệm vụ
    feePerUseVnd: 5000,       // [on-chain] phí quán trả mỗi lượt voucher được dùng (đồng)
  },
} as const;

export type Config = typeof CONFIG;

/** Kiểm tra config hợp lệ (gọi khi khởi động backend để bắt lỗi gõ nhầm sớm). */
export function validateConfig(c: Config = CONFIG): void {
  const n = c.ranks.names.length;
  if (n !== 6) throw new Error("ranks.names phải có đúng 6 hạng (hợp đồng chỉ hỗ trợ 6)");
  if (c.ranks.minKmPerWeek.length !== n || c.ranks.keepTokensAtSeasonEnd.length !== n)
    throw new Error("minKmPerWeek và keepTokensAtSeasonEnd phải có cùng số phần tử với names");
  for (let i = 1; i < n; i++) {
    if (c.ranks.minKmPerWeek[i] < c.ranks.minKmPerWeek[i - 1]) throw new Error("minKmPerWeek phải tăng dần");
  }
  for (const [k, v] of Object.entries(c.voucher.discount)) {
    if (v < 0 || v > 100) throw new Error(`voucher.discount.${k} phải từ 0 đến 100`);
  }
}
