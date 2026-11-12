// `pnpm db:seed` / `pnpm demo:reset`: đưa DB về trạng thái demo.
import { PrismaClient } from '@prisma/client';
import { DEMO_PASSWORD, SEED_ACCOUNT_COUNT, seedDemo } from './seed-data.js';

const prisma = new PrismaClient();
try {
  await seedDemo(prisma);
  console.log(`Seed xong: ${SEED_ACCOUNT_COUNT} tài khoản (mật khẩu: ${DEMO_PASSWORD})`);
} finally {
  await prisma.$disconnect();
}
