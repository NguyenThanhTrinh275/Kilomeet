import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// Áp migration lên DB test (kilomeet_test) trước khi chạy test.
export default function setup() {
  const url = /^DATABASE_URL=(.*)$/m.exec(readFileSync(new URL('../../.env.test', import.meta.url), 'utf8'))?.[1];
  if (!url) throw new Error('.env.test thiếu DATABASE_URL');
  execSync('pnpm exec prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'pipe',
  });
}
