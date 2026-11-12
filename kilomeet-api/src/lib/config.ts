import { existsSync } from 'node:fs';
import { z } from 'zod';

// Dev/prod đọc .env; test nhận biến từ vitest.config.ts (.env.test).
if (!process.env.VITEST && existsSync('.env')) process.loadEnvFile('.env');

const bool = z
  .enum(['true', 'false', '1', '0', ''])
  .default('false')
  .transform((v) => v === 'true' || v === '1');

const EnvZ = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET phải dài ít nhất 16 ký tự'),
  PORT: z.coerce.number().int().min(0).default(3000),
  CHAIN: z.enum(['fake', 'fuji']).default('fake'),
  FUJI_RPC_URL: z.string().default('https://api.avax-test.network/ext/bc/C/rpc'),
  /** Khoá ví operator (relayer) ký mọi giao dịch. OPERATOR_PRIVATE_KEY là tên bên ../blockchain dùng. */
  SERVER_PRIVATE_KEY: z.string().default(''),
  OPERATOR_PRIVATE_KEY: z.string().default(''),
  WALLET_MNEMONIC: z.string().default(''),
  RUN_TOKEN_ADDRESS: z.string().default(''),
  VOUCHER_ADDRESS: z.string().default(''),
  BADGE_ADDRESS: z.string().default(''),
  /** Bỏ trống 3 địa chỉ trên thì đọc từ file deploy của ../blockchain */
  CHAIN_DEPLOYMENT: z.string().default('../blockchain/deployments/fuji.json'),
  /** Trang tra cứu giao dịch (Snowtrace Fuji) */
  EXPLORER_URL: z.string().default('https://testnet.snowtrace.io'),
  MEMBERSHIP_DAYS: z.coerce.number().int().positive().default(30),
  ALLOW_CLOCK_OVERRIDE: bool,
});

const parsed = EnvZ.safeParse(process.env);
if (!parsed.success) {
  const lines = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
  throw new Error(`Biến môi trường không hợp lệ (xem .env.example):\n${lines.join('\n')}`);
}

export const config = parsed.data;
export type Config = typeof config;
