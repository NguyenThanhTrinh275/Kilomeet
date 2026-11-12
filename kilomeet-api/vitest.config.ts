import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

// Nạp .env.test (DB kilomeet_test) cho mọi test.
const env = Object.fromEntries(
  readFileSync(new URL('./.env.test', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.trim() && !l.startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
);

export default defineConfig({
  test: {
    env,
    globalSetup: ['./test/helpers/global-setup.ts'],
    // Test API dùng chung một DB → chạy tuần tự từng file.
    fileParallelism: false,
  },
});
