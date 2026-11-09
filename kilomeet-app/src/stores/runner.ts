// Zustand — Runner store (tokens, rank, runs, quests)
import { create } from 'zustand';
import type { Run, Quest, Rank, Runner } from '../api/types';
import { api } from '../api/client';

interface RunnerState {
  tokenBalance: number;
  rank: Rank;
  kmThisWeek: number;
  runs: Run[];
  quests: Quest[];
  isLoading: boolean;

  /** Sync state from auth user */
  syncFromUser: (user: Runner) => void;
  fetchRuns: () => Promise<void>;
  fetchQuests: () => Promise<void>;
  startRun: () => Promise<Run>;
  endRun: (runId: string, distanceKm: number, durationMinutes: number, route: Run['route'], passedStoreIds: string[]) => Promise<Run>;
  completeQuest: (questId: string) => Promise<void>;
}

export const useRunnerStore = create<RunnerState>((set, get) => ({
  tokenBalance: 0,
  rank: 'đồng',
  kmThisWeek: 0,
  runs: [],
  quests: [],
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
    const runs = await api.get<Run[]>('/runs');
    set({ runs, isLoading: false });
  },

  fetchQuests: async () => {
    set({ isLoading: true });
    const quests = await api.get<Quest[]>('/quests');
    set({ quests, isLoading: false });
  },

  startRun: async () => {
    const run = await api.post<Run>('/runs/start');
    return run;
  },

  endRun: async (runId, distanceKm, durationMinutes, route, passedStoreIds) => {
    const run = await api.post<Run>('/runs/end', {
      runId, distanceKm, durationMinutes, route, passedStoreIds,
    });
    set((s) => ({ runs: [run, ...s.runs] }));
    return run;
  },

  completeQuest: async (questId) => {
    const updated = await api.post<Quest>('/quests/complete', { questId });
    set((s) => ({
      quests: s.quests.map((q) => (q.id === updated.id ? updated : q)),
      tokenBalance: s.tokenBalance + updated.rewardTokens,
    }));
  },
}));
