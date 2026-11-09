// Zustand — Group store
import { create } from 'zustand';
import type { GroupRun } from '../api/types';
import { api } from '../api/client';

interface GroupState {
  groups: GroupRun[];
  currentGroup: GroupRun | null;
  isLoading: boolean;

  fetchGroups: (userId?: string) => Promise<void>;
  fetchGroupDetail: (groupId: string) => Promise<void>;
  createGroup: (data: {
    date: string;
    timeSlot: string;
    meetingPoint: { name: string; latitude: number; longitude: number };
    distanceKm: number;
    rankRange: GroupRun['rankRange'];
  }) => Promise<GroupRun>;
  joinGroup: (groupId: string) => Promise<void>;
}

export const useGroupStore = create<GroupState>((set) => ({
  groups: [],
  currentGroup: null,
  isLoading: false,

  fetchGroups: async (userId) => {
    set({ isLoading: true });
    const params = userId ? { userId } : undefined;
    const groups = await api.get<GroupRun[]>('/groups', params);
    set({ groups, isLoading: false });
  },

  fetchGroupDetail: async (groupId) => {
    set({ isLoading: true });
    const currentGroup = await api.get<GroupRun>('/groups/detail', { groupId });
    set({ currentGroup, isLoading: false });
  },

  createGroup: async (data) => {
    const group = await api.post<GroupRun>('/groups/create', data);
    set((s) => ({ groups: [...s.groups, group] }));
    return group;
  },

  joinGroup: async (groupId) => {
    const updated = await api.post<GroupRun>('/groups/join', { groupId });
    set((s) => ({
      groups: s.groups.map((g) => (g.id === updated.id ? updated : g)),
      currentGroup: s.currentGroup?.id === updated.id ? updated : s.currentGroup,
    }));
  },
}));
