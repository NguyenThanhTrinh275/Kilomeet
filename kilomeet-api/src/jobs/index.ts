import type { FastifyBaseLogger } from 'fastify';
import cron from 'node-cron';
import { runMembershipExpiry } from '../modules/auth/membership.js';
import { runGroupTimeline } from '../modules/groups/service.js';
import { runWeeklyRanking } from '../modules/seasons/service.js';
import { processChainOutbox } from './chain-outbox.js';

const TZ = 'Asia/Ho_Chi_Minh';

/**
 * Cron chạy theo giờ THẬT. Khi demo tua giờ (POST /admin/clock), dùng các endpoint /admin/run-* thay thế.
 */
export function startJobs(log: FastifyBaseLogger) {
  const wrap = (name: string, fn: () => Promise<unknown>) => async () => {
    try {
      const r = await fn();
      log.info({ job: name, result: r }, 'job done');
    } catch (err) {
      log.error({ job: name, err }, 'job failed');
    }
  };
  const quiet = (name: string, fn: () => Promise<unknown>) => async () => {
    try {
      await fn();
    } catch (err) {
      log.error({ job: name, err }, 'job failed');
    }
  };
  const tasks = [
    cron.schedule('59 23 * * 0', wrap('weekly-ranking', () => runWeeklyRanking()), { timezone: TZ }),
    cron.schedule('5 0 * * *', wrap('membership-expiry', () => runMembershipExpiry()), { timezone: TZ }),
    cron.schedule('* * * * *', quiet('group-timeline', () => runGroupTimeline()), { timezone: TZ }),
    cron.schedule('*/5 * * * * *', quiet('chain-outbox', () => processChainOutbox()), { timezone: TZ }),
  ];
  return () => tasks.forEach((t) => t.stop());
}
