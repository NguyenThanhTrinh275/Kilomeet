import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import type { z } from 'zod';
import { clock } from '../../lib/clock.js';
import { conflict, unauthorized } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import { signToken } from '../../lib/auth.js';
import { walletAddressFor } from '../../lib/wallet.js';
import { toApiUser, userInclude } from './present.js';
import type { LoginBody, RegisterBody } from './schemas.js';

const BCRYPT_ROUNDS = 10;
const WRONG_LOGIN = 'Email hoặc mật khẩu không đúng';

export async function login(body: z.output<typeof LoginBody>) {
  const user = await prisma.user.findUnique({ where: { email: body.email }, include: userInclude });
  // So hash cả khi không có user để thời gian phản hồi không lộ email có tồn tại.
  const hash = user?.passwordHash ?? '$2b$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv';
  const okPw = await bcrypt.compare(body.password, hash);
  if (!user || !okPw) throw unauthorized(WRONG_LOGIN);
  return { user: toApiUser(user, clock.now()), token: signToken(user) };
}

export async function register(body: z.output<typeof RegisterBody>) {
  const passwordHash = await bcrypt.hash(body.password, BCRYPT_ROUNDS);
  const now = clock.now();
  try {
    const user = await prisma.$transaction(async (tx) => {
      // walletIndex tự tăng → tạo trước, rồi dẫn xuất địa chỉ ví theo chỉ số đó.
      const created = await tx.user.create({
        data: {
          email: body.email,
          name: body.name,
          passwordHash,
          role: body.role,
          walletAddress: `pending:${body.email}`,
          createdAt: now,
          ...(body.role === 'store'
            ? {
                store: {
                  create: {
                    storeName: body.storeName!,
                    storeAddress: body.storeAddress!,
                    lat: body.latitude!,
                    lng: body.longitude!,
                    status: 'pending',
                    appliedAt: now,
                  },
                },
              }
            : { runner: { create: {} } }),
        },
      });
      return tx.user.update({
        where: { id: created.id },
        data: { walletAddress: walletAddressFor(created.walletIndex) },
        include: userInclude,
      });
    });
    return { user: toApiUser(user, clock.now()), token: signToken(user) };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      throw conflict('Email đã được sử dụng');
    }
    throw e;
  }
}

export async function me(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: userInclude });
  if (!user) throw unauthorized();
  return toApiUser(user, clock.now());
}
