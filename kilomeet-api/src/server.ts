import { buildApp } from './app.js';
import { startJobs } from './jobs/index.js';
import { config } from './lib/config.js';

const app = await buildApp({ logger: { level: 'info' } });
const stopJobs = startJobs(app.log);
app.addHook('onClose', async () => stopJobs());

// 0.0.0.0 để điện thoại cùng mạng LAN gọi được.
await app.listen({ host: '0.0.0.0', port: config.PORT });
app.log.info(`KILOMeet API · chain=${config.CHAIN} · clock override=${config.ALLOW_CLOCK_OVERRIDE}`);

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => void app.close().then(() => process.exit(0)));
}
