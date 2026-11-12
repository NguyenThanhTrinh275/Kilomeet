import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { AppError } from './errors.js';

export interface Ok<T> {
  success: true;
  data: T;
}
export interface Fail {
  success: false;
  message: string;
}

export const ok = <T>(data: T): Ok<T> => ({ success: true, data });
export const fail = (message: string): Fail => ({ success: false, message });

/**
 * Mọi lỗi (kể cả 404, JSON hỏng, lỗi lạ) đều trả `{ success:false, message }`.
 * FE chỉ đọc `json.success`, nên body không đúng dạng là app crash.
 */
export function registerEnvelope(app: FastifyInstance): void {
  // FE gửi `Content-Type: application/json` cả khi không có body (vd. /auth/subscribe).
  app.removeContentTypeParser('application/json');
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (_req, body, done) => {
    const text = typeof body === 'string' ? body : body.toString('utf8');
    if (!text.trim()) return done(null, {});
    try {
      done(null, JSON.parse(text));
    } catch {
      done(new AppError(400, 'Dữ liệu gửi lên không phải JSON hợp lệ'), undefined);
    }
  });

  app.setNotFoundHandler((_req, reply) => {
    void reply.code(404).send(fail('Không tìm thấy đường dẫn'));
  });

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof AppError) {
      return reply.code(err.statusCode).send(fail(err.message));
    }
    if (err instanceof ZodError) {
      return reply.code(400).send(fail(zodMessage(err)));
    }
    const e = err as { statusCode?: number; code?: string };
    if (e.statusCode && e.statusCode >= 400 && e.statusCode < 500) {
      req.log.warn({ err }, 'client error');
      const msg = e.code === 'FST_ERR_CTP_BODY_TOO_LARGE' ? 'Dữ liệu gửi lên quá lớn' : 'Yêu cầu không hợp lệ';
      return reply.code(e.statusCode).send(fail(msg));
    }
    req.log.error({ err }, 'unhandled error');
    return reply.code(500).send(fail('Lỗi máy chủ, vui lòng thử lại'));
  });
}

export function zodMessage(err: ZodError): string {
  const issue = err.issues[0];
  if (!issue) return 'Dữ liệu không hợp lệ';
  const field = issue.path.join('.');
  // Message tự viết (tiếng Việt) trong schema được ưu tiên.
  if (issue.message && !issue.message.startsWith('Invalid') && !issue.message.startsWith('Too')) {
    return issue.message;
  }
  return field ? `Dữ liệu không hợp lệ: ${field}` : 'Dữ liệu không hợp lệ';
}
