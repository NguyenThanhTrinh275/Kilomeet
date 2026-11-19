import { describe, expect, it } from 'vitest';
import { route5km2Stores } from '../../scripts/demo-routes.js';
import { FailZ, StoreProfileZ, okZ } from '../../src/contract/schemas.js';
import { doRun, TEST_NOW, useTestApp } from '../helpers/app.js';

const ctx = useTestApp();
const fail = async (p: Promise<{ json: unknown }>) => FailZ.parse((await p).json).message;

describe('GET /stores/profile (người chạy đọc trước khi mua)', () => {
  it('Fuji: đúng hình dạng, có giới thiệu từ seed', async () => {
    const t = await ctx.login('lan@demo.com');
    const p = okZ(StoreProfileZ).parse((await ctx.get('/stores/profile?storeId=store-fuji', t)).json).data;
    expect(p).toMatchObject({
      storeId: 'store-fuji',
      storeName: 'Fuji Coffee',
      tagline: 'Cà phê rang xay cạnh HCMUT',
      address: '268 Lý Thường Kiệt, P.14, Q.10',
      latitude: 10.773,
      longitude: 106.66,
      coverTheme: 'coffee',
      verified: true,
      totalUsages: 47,
      runnerSharePercent: 0,
    });
    expect(p.openingHours).toHaveLength(3);
    expect(p.highlights[0]).toEqual({ name: 'Cà phê muối', priceVnd: 35000 });
  });

  it('quán chưa duyệt → "Không tìm thấy cửa hàng" với người chạy; id lạ cũng vậy; thiếu storeId báo lỗi', async () => {
    const t = await ctx.login('lan@demo.com');
    expect(await fail(ctx.get('/stores/profile?storeId=store-pending-1', t))).toBe('Không tìm thấy cửa hàng');
    expect(await fail(ctx.get('/stores/profile?storeId=nope', t))).toBe('Không tìm thấy cửa hàng');
    expect(await fail(ctx.get('/stores/profile', t))).toBe('Thiếu storeId');
  });

  it('chưa đăng nhập → lỗi envelope', async () => {
    const r = await ctx.get('/stores/profile?storeId=store-fuji');
    expect(r.json.success).toBe(false);
  });

  it('runnerSharePercent tính từ lượt dùng có questCompletedAt', async () => {
    const minh = await ctx.login('minh@demo.com');
    const run = await doRun(ctx, minh, route5km2Stores(TEST_NOW));
    await ctx.post('/runs/claim-store', { runId: run.json.data.id, storeId: 'store-fuji' }, minh);
    const quest = (await ctx.post('/vouchers/buy', { templateId: 'vt-1' }, minh)).json.data; // có giảm
    const plain = (await ctx.post('/vouchers/buy', { templateId: 'vt-1' }, minh)).json.data; // giá gốc
    const fuji = await ctx.login('quanfuji@demo.com');
    await ctx.post('/store/scan', { qrCode: quest.qrCode }, fuji);
    await ctx.post('/store/scan', { qrCode: plain.qrCode }, fuji);
    const p = (await ctx.get('/stores/profile?storeId=store-fuji', minh)).json.data;
    expect(p).toMatchObject({ totalUsages: 49, runnerSharePercent: 50 });
  });
});

describe('GET/POST /store/profile (chủ quán)', () => {
  it('quán chưa duyệt vẫn xem được hồ sơ mặc định của mình', async () => {
    const t = await ctx.login('newcafe@demo.com');
    const p = okZ(StoreProfileZ).parse((await ctx.get('/store/profile', t)).json).data;
    expect(p).toMatchObject({ storeId: 'store-pending-1', tagline: '', description: '', coverTheme: 'coffee', verified: false, tags: [], highlights: [] });
    expect(p.openingHours.map((h) => h.label)).toEqual(['T2 – T6', 'Thứ 7', 'Chủ nhật']);
    // chủ quán xem trước trang của mình qua /stores/profile
    expect((await ctx.get('/stores/profile?storeId=store-pending-1', t)).json.success).toBe(true);
  });

  it('lưu toàn bộ hồ sơ như FE gửi; người chạy thấy ngay; field chỉ đọc bị bỏ qua', async () => {
    const t = await ctx.login('quanfuji@demo.com');
    const body = {
      storeName: 'Fuji Coffee HCMUT',
      tagline: 'Cà phê rang mỗi sáng',
      description: 'Quán nhỏ cạnh trường, mở sớm cho người chạy bộ. Có nước lọc miễn phí và chỗ giãn cơ.',
      coverTheme: 'tea',
      tags: ['Cà phê', 'Wifi', 'Wifi'],
      openingHours: [{ label: 'Hằng ngày', open: '05:30', close: '22:00', enabled: true }],
      highlights: [
        { name: 'Cà phê muối', priceVnd: 35000 },
        { name: 'Bạc xỉu', priceVnd: 30000 },
        { name: 'Cold brew', priceVnd: 45000 },
      ],
      phone: '0909 123 456',
      latitude: 1, longitude: 1, verified: false, totalUsages: 999, address: 'x',
    };
    const saved = okZ(StoreProfileZ).parse((await ctx.post('/store/profile', body, t)).json).data;
    expect(saved).toMatchObject({ storeName: 'Fuji Coffee HCMUT', coverTheme: 'tea', tags: ['Cà phê', 'Wifi'], latitude: 10.773, verified: true, totalUsages: 47, address: '268 Lý Thường Kiệt, P.14, Q.10' });
    expect(saved.highlights).toHaveLength(3);

    const lan = await ctx.login('lan@demo.com');
    expect((await ctx.get('/stores/profile?storeId=store-fuji', lan)).json.data).toMatchObject({ tagline: 'Cà phê rang mỗi sáng', openingHours: body.openingHours });
    // Tên quán mới hiện cả ở danh sách voucher
    const vt = (await ctx.get('/vouchers', lan)).json.data.find((v: { id: string }) => v.id === 'vt-1');
    expect(vt.storeName).toBe('Fuji Coffee HCMUT');
  });

  it('gửi một phần → chỉ đổi phần đó', async () => {
    const t = await ctx.login('quanfuji@demo.com');
    const p = (await ctx.post('/store/profile', { phone: '028 1234 5678' }, t)).json.data;
    expect(p).toMatchObject({ phone: '028 1234 5678', tagline: 'Cà phê rang xay cạnh HCMUT' });
  });

  it('lỗi validate bằng tiếng Việt', async () => {
    const t = await ctx.login('quanfuji@demo.com');
    expect(await fail(ctx.post('/store/profile', { tagline: 'x'.repeat(61) }, t))).toBe('Câu giới thiệu ngắn tối đa 60 ký tự');
    expect(await fail(ctx.post('/store/profile', { description: 'x'.repeat(501) }, t))).toBe('Giới thiệu chi tiết tối đa 500 ký tự');
    expect(await fail(ctx.post('/store/profile', { openingHours: [{ label: 'T2', open: '6h', close: '22:00', enabled: true }] }, t))).toBe('Giờ mở cửa phải theo dạng HH:mm');
    expect(await fail(ctx.post('/store/profile', { highlights: [1, 2, 3, 4].map((i) => ({ name: `M${i}`, priceVnd: 1 })) }, t))).toBe('Tối đa 3 món nổi bật');
    expect(await fail(ctx.post('/store/profile', { tags: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] }, t))).toBe('Chọn tối đa 6 thẻ tiện ích');
    expect(await fail(ctx.post('/store/profile', { coverTheme: 'beach' }, t))).toBe('Ảnh bìa không hợp lệ');
    expect(await fail(ctx.post('/store/profile', { storeName: '  ' }, t))).toBe('Vui lòng nhập tên quán');
  });

  it('người chạy gọi /store/profile → "Không phải tài khoản cửa hàng"', async () => {
    const t = await ctx.login('lan@demo.com');
    expect(await fail(ctx.get('/store/profile', t))).toBe('Không phải tài khoản cửa hàng');
    expect(await fail(ctx.post('/store/profile', { tagline: 'x' }, t))).toBe('Không phải tài khoản cửa hàng');
  });
});
