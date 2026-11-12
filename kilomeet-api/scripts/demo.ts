// CLI cho demo, gọi API như điện thoại. Server phải đang chạy (pnpm dev).
//
//   pnpm demo replay <email|lan|minh> <3km|5km-2-quan> [--claim store-fuji]
//   pnpm demo clock <ISO|reset|sunday>      tua giờ server (sunday = CN 23:59 tuần này)
//   pnpm demo ranking                       chấm hạng tuần ngay
//   pnpm demo season <end|start>
//   pnpm demo timeline                      xử lý mốc giờ nhóm chạy
//   pnpm demo outbox                        gửi lệnh chain đang chờ
//   pnpm demo me <email>                    xem số dư / hạng
//
// API mặc định http://localhost:3000, đổi bằng biến API_URL.
import { ROUTES } from './demo-routes.js';
import { endOfVnWeek } from '../src/domain/time.js';

const API = (process.env.API_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
const PASSWORD = process.env.DEMO_PASSWORD ?? 'demo123';

async function call<T>(method: 'GET' | 'POST', path: string, body?: unknown, token?: string): Promise<T> {
  const res = await fetch(API + path, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = (await res.json()) as { success: boolean; data: T; message?: string };
  if (!json.success) throw new Error(`${method} ${path}: ${json.message}`);
  return json.data;
}

const emailOf = (u: string) => (u.includes('@') ? u : `${u}@demo.com`);
const login = async (u: string) => (await call<{ token: string }>('POST', '/auth/login', { email: emailOf(u), password: PASSWORD })).token;
const admin = () => login('admin');
const serverNow = async () => new Date((await call<{ time: string }>('GET', '/health')).time);

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

async function me(u: string) {
  const t = await login(u);
  const m = await call<Record<string, unknown>>('GET', '/auth/me', undefined, t);
  console.log(`${m.name}: hạng ${m.rank} · ${m.tokenBalance} token · ${m.kmThisWeek} km tuần này`);
}

async function replay(user: string, routeName: string) {
  const make = ROUTES[routeName as keyof typeof ROUTES];
  if (!make) throw new Error(`Route không có: ${routeName}. Chọn: ${Object.keys(ROUTES).join(', ')}`);
  const t = await login(user);
  const now = await serverNow();
  // Route kết thúc đúng "bây giờ" theo đồng hồ server.
  const draft = make(now);
  const span = Date.parse(draft.at(-1)!.timestamp!) - Date.parse(draft[0]!.timestamp!);
  const route = make(new Date(now.getTime() - span));
  const run = await call<{ id: string }>('POST', '/runs/start', undefined, t);
  const ended = await call<{ distanceKm: number; durationMinutes: number; passedStoreIds: string[]; claimedStoreId: string | null }>(
    'POST', '/runs/end', { runId: run.id, durationMinutes: Math.round(span / 60_000), route }, t,
  );
  console.log(`✓ ${emailOf(user)} chạy ${ended.distanceKm} km trong ${ended.durationMinutes} phút`);
  if (ended.passedStoreIds.length) console.log(`  đi ngang: ${ended.passedStoreIds.join(', ')}${ended.claimedStoreId ? ` (tự nhận ${ended.claimedStoreId})` : ''}`);
  const claim = flag('claim');
  if (claim) {
    const c = await call<{ expiresAt: string }>('POST', '/runs/claim-store', { runId: run.id, storeId: claim }, t);
    console.log(`  đã chọn ${claim}, giảm giá tới ${c.expiresAt}`);
  } else if (ended.passedStoreIds.length > 1) {
    console.log(`  → chọn 1 quán trên app, hoặc chạy lại với --claim <storeId>  (runId ${run.id})`);
  }
  await me(user);
}

const [cmd, a1, a2] = process.argv.slice(2).filter((x, i, arr) => !x.startsWith('--') && !arr[i - 1]?.startsWith('--'));
try {
  switch (cmd) {
    case 'replay':
      await replay(a1 ?? 'lan', a2 ?? '3km');
      break;
    case 'clock': {
      const t = await admin();
      const body = a1 === 'reset' ? { offsetMs: 0 }
        : a1 === 'sunday' ? { now: new Date(endOfVnWeek(await serverNow()).getTime() - 59_999).toISOString() }
        : a1 ? { now: new Date(a1).toISOString() } : null;
      const r = body ? await call('POST', '/admin/clock', body, t) : await call('GET', '/admin/clock', undefined, t);
      console.log(r);
      break;
    }
    case 'ranking':
      console.log(await call('POST', '/admin/run-weekly-ranking', {}, await admin()));
      break;
    case 'season':
      console.log(await call('POST', '/admin/season', { action: a1 ?? 'end' }, await admin()));
      break;
    case 'timeline':
      console.log(await call('POST', '/admin/run-group-timeline', {}, await admin()));
      break;
    case 'outbox':
      console.log(await call('POST', '/admin/process-chain-outbox', {}, await admin()));
      break;
    case 'me':
      await me(a1 ?? 'lan');
      break;
    default:
      console.log('Lệnh: replay | clock | ranking | season | timeline | outbox | me  (xem đầu file scripts/demo.ts)');
  }
} catch (e) {
  console.error(`✗ ${(e as Error).message}`);
  process.exit(1);
}
