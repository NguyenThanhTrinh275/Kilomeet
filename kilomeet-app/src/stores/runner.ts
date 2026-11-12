// Zustand — Runner store (tokens, rank, runs, quests, season)
import { create } from 'zustand';
import type { Run, Quest, Rank, Runner, GpsPoint } from '../api/types';
import { api } from '../api/client';

export interface CurrentSeason {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  daysLeft: number;
}

export interface PassedStore {
  storeId: string;
  storeName: string;
  claimed: boolean;
}

interface RunnerState {
  tokenBalance: number;
  rank: Rank;
  kmThisWeek: number;
  runs: Run[];
  quests: Quest[];
  season: CurrentSeason | null;
  isLoading: boolean;

  /** Sync state from auth user */
  syncFromUser: (user: Runner) => void;
  fetchRuns: () => Promise<void>;
  fetchQuests: () => Promise<Quest[]>;
  fetchSeason: () => Promise<void>;
  startRun: () => Promise<Run>;
  endRun: (runId: string, distanceKm: number, durationMinutes: number, route: GpsPoint[], passedStoreIds: string[]) => Promise<Run & { claimedStoreId?: string | null }>;
  /** Idempotent ở BE, KHÔNG phát token — BE đã chấm nhiệm vụ trong /runs/end. */
  completeQuest: (questId: string) => Promise<void>;
  fetchPassedStores: (runId: string) => Promise<PassedStore[]>;
  claimStore: (runId: string, storeId: string) => Promise<{ storeId: string; expiresAt: string }>;
}

export const useRunnerStore = create<RunnerState>((set) => ({
  tokenBalance: 0,
  rank: 'đồng',
  kmThisWeek: 0,
  runs: [],
  quests: [],
  season: null,
  isLoading: false,

  syncFromUser: (user) => {
    set({
      tokenBalance: user.tokenBalance,
      rank: user.rank,
      kmThisWeek: user.kmThisWeek,
    });
  },

  fetchRuns: async () => {
    set({ isLoading: true });
    try {
      const runs = await api.get<Run[]>('/runs');
      set({ runs });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchQuests: async () => {
    set({ isLoading: true });
    try {
      const quests = await api.get<Quest[]>('/quests');
      set({ quests });
      return quests;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchSeason: async () => {
    const season = await api.get<CurrentSeason | null>('/seasons/current');
    set({ season });
  },

  startRun: async () => {
    const run = await api.post<Run>('/runs/start');
    return run;
  },

  endRun: async (runId, distanceKm, durationMinutes, route, passedStoreIds) => {
    // BE tự tính lại distanceKm và passedStoreIds, giá trị FE gửi chỉ để tương thích mock.
    const run = await api.post<Run & { claimedStoreId?: string | null }>('/runs/end', {
      runId, distanceKm, durationMinutes, route, passedStoreIds,
    });
    set((s) => ({ runs: [run, ...s.runs.filter((r) => r.id !== run.id)] }));
    return run;
  },

  completeQuest: async (questId) => {
    const updated = await api.post<Quest>('/quests/complete', { questId });
    set((s) => ({ quests: s.quests.map((q) => (q.id === updated.id ? updated : q)) }));
  },

  fetchPassedStores: (runId) => api.get<PassedStore[]>('/runs/passed-stores', { runId }),

  claimStore: (runId, storeId) => api.post<{ storeId: string; expiresAt: string }>('/runs/claim-store', { runId, storeId }),
}));
