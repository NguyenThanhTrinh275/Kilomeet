import type { z } from 'zod';
import { AppError } from './errors.js';
import { zodMessage } from './envelope.js';

/** Parse body/query bằng Zod; sai thì ném lỗi 400 với message tiếng Việt. */
export function parse<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const r = schema.safeParse(input ?? {});
  if (!r.success) throw new AppError(400, zodMessage(r.error));
  return r.data;
}
