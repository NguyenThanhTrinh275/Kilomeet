import type { Role } from '@prisma/client';
import type { FastifyReply, FastifyRequest, preHandlerAsyncHookHandler } from 'fastify';
import jwt from 'jsonwebtoken';
import { expireMember } from '../modules/auth/membership.js';
import { clock } from './clock.js';
import { config } from './config.js';
import { forbidden, unauthorized } from './errors.js';
import { prisma } from './prisma.js';

export interface AuthUser {
  id: string;
  role: Role;
}

declare module 'fastify' {
  interface FastifyRequest {
    auth?: AuthUser;
  }
}

const TOKEN_TTL = '30d';

export function signToken(user: AuthUser): string {
  return jwt.sign({ role: user.role }, config.JWT_SECRET, { subject: user.id, expiresIn: TOKEN_TTL });
}

function verifyToken(token: string): string | null {
  try {
    const p = jwt.verify(token, config.JWT_SECRET);
    return typeof p === 'object' && typeof p.sub === 'string' ? p.sub : null;
  } catch {
    return null;
  }
}

async function authenticate(req: FastifyRequest): Promise<AuthUser> {
  const header = req.headers.authorization ?? '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) throw unauthorized();
  const userId = verifyToken(token);
  if (!userId) throw unauthorized();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, runner: { select: { memberUntil: true } } },
  });
  if (!user) throw unauthorized();
  // Role đọc lại từ DB (runner ↔ member đổi được). Gói hội viên hết hạn thì hạ ngay.
  const now = clock.now();
  if (user.role === 'member' && user.runner?.memberUntil && user.runner.memberUntil.getTime() < now.getTime()) {
    await expireMember(user.id, now);
    return { id: user.id, role: 'runner' };
  }
  return { id: user.id, role: user.role };
}

/** preHandler: kiểm tra Bearer JWT; truyền vai trò để giới hạn quyền. */
export function requireAuth(...roles: Role[]): preHandlerAsyncHookHandler {
  return requireAuthWith('Bạn không có quyền thực hiện thao tác này', ...roles);
}

/** Như requireAuth nhưng sai vai trò thì trả `message` riêng (vd. "Tính năng dành cho Hội viên"). */
export function requireAuthWith(message: string, ...roles: Role[]): preHandlerAsyncHookHandler {
  return async function (req: FastifyRequest, _reply: FastifyReply) {
    const user = await authenticate(req);
    if (roles.length && !roles.includes(user.role)) throw forbidden(message);
    req.auth = user;
  };
}

/** Lấy user đã xác thực trong handler (sau requireAuth). */
export function authOf(req: FastifyRequest): AuthUser {
  if (!req.auth) throw unauthorized();
  return req.auth;
}
