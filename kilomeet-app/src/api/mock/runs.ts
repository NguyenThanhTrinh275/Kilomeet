// Mock — Run handlers
import type { Run } from '../types';
import { getCurrentUserId } from './data';

// Generate Minh's 20+ run history over past weeks
function generateMinhRuns(): Run[] {
  const runs: Run[] = [];
  const baseDate = new Date('2026-11-10T06:00:00Z');

  for (let i = 0; i < 24; i++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() - i);
    const km = 5 + Math.random() * 8; // 5-13km per run
    const pace = 5 + Math.random() * 1.5; // 5:00-6:30 min/km
    const duration = km * pace;

    runs.push({
      id: `run-minh-${i}`,
      userId: 'user-minh',
      distanceKm: Math.round(km * 100) / 100,
      durationMinutes: Math.round(duration * 10) / 10,
      avgPaceMinPerKm: Math.round(pace * 100) / 100,
      route: [
        { latitude: 10.773 + Math.random() * 0.01, longitude: 106.660 + Math.random() * 0.01, timestamp: date.toISOString() },
        { latitude: 10.775 + Math.random() * 0.01, longitude: 106.662 + Math.random() * 0.01, timestamp: new Date(date.getTime() + duration * 60000).toISOString() },
      ],
      startedAt: date.toISOString(),
      endedAt: new Date(date.getTime() + duration * 60000).toISOString(),
      passedStoreIds: i % 3 === 0 ? ['store-fuji'] : [],
    });
  }
  return runs;
}

const runHistory: Record<string, Run[]> = {
  'user-minh': generateMinhRuns(),
  'user-lan': [],
};

export function mockStartRun(body: unknown): Run {
  const userId = getCurrentUserId();
  const run: Run = {
    id: `run-${Date.now()}`,
    userId,
    distanceKm: 0,
    durationMinutes: 0,
    avgPaceMinPerKm: 0,
    route: [],
    startedAt: new Date().toISOString(),
    endedAt: '',
    passedStoreIds: [],
  };
  if (!runHistory[userId]) runHistory[userId] = [];
  runHistory[userId].unshift(run);
  return run;
}

export function mockEndRun(body: unknown): Run {
  const userId = getCurrentUserId();
  const { runId, distanceKm, durationMinutes, route, passedStoreIds } =
    body as { runId: string; distanceKm: number; durationMinutes: number; route: Run['route']; passedStoreIds: string[] };

  const runs = runHistory[userId] ?? [];
  const run = runs.find((r) => r.id === runId);
  if (!run) throw new Error('Run not found');

  run.distanceKm = distanceKm;
  run.durationMinutes = durationMinutes;
  run.avgPaceMinPerKm = durationMinutes / distanceKm;
  run.route = route;
  run.endedAt = new Date().toISOString();
  run.passedStoreIds = passedStoreIds;
  return run;
}

export function mockGetRunHistory(params?: Record<string, string>): Run[] {
  const userId = params?.userId ?? getCurrentUserId();
  return runHistory[userId] ?? [];
}
