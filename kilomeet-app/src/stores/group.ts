// Zustand — Group store
import { create } from 'zustand';
import type { GroupRun, RankRange } from '../api/types';
import { api } from '../api/client';
import { useAuthStore } from './auth';

export interface MemberLocation {
  userId: string;
  userName: string;
  latitude: number;
  longitude: number;
  etaMinutes: number;
  arrived: boolean;
  updatedAt: string;
}

export interface MeetingPoint {
  name: string;
  latitude: number;
  longitude: number;
  type: 'public' | 'store';
}

export interface AutoMatchResult {
  requestId: string;
  status: 'pending' | 'matched' | 'expired' | 'cancelled';
  groupId: string | null;
}

interface GroupState {
  groups: GroupRun[];
  currentGroup: GroupRun | null;
  isLoading: boolean;

  fetchGroups: (userId?: string) => Promise<void>;
  fetchGroupDetail: (groupId: string, silent?: boolean) => Promise<void>;
  createGroup: (data: {
    date: string;
    timeSlot: string;
    meetingPoint: { name: string; latitude: number; longitude: number };
    distanceKm: number;
    rankRange: GroupRun['rankRange'];
  }) => Promise<GroupRun>;
  /** Tham gia (nếu chưa) rồi xác nhận luôn. */
  joinGroup: (groupId: string) => Promise<void>;
  leaveGroup: (groupId: string) => Promise<void>;
  fetchLocations: (groupId: string) => Promise<MemberLocation[]>;
  shareLocation: (groupId: string, latitude: number, longitude: number) => Promise<{ arrived: boolean }>;
  fetchMeetingPoints: () => Promise<MeetingPoint[]>;
  autoMatch: (data: {
    date: string;
    timeSlots: string[];
    distanceKm: number;
    rankRange: RankRange;
    latitude: number;
    longitude: number;
  }) => Promise<AutoMatchResult>;
}

export const useGroupStore = create<GroupState>((set, get) => ({
  groups: [],
  currentGroup: null,
  isLoading: false,

  fetchGroups: async (userId) => {
    set({ isLoading: true });
    try {
      const params = userId ? { userId } : undefined;
      const groups = await api.get<GroupRun[]>('/groups', params);
      set({ groups });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchGroupDetail: async (groupId, silent) => {
    if (!silent) set({ isLoading: true });
    try {
      const currentGroup = await api.get<GroupRun>('/groups/detail', { groupId });
      set({ currentGroup });
    } finally {
      if (!silent) set({ isLoading: false });
    }
  },

  createGroup: async (data) => {
    const group = await api.post<GroupRun>('/groups/create', data);
    set((s) => ({ groups: [...s.groups, group] }));
    return group;
  },

  joinGroup: async (groupId) => {
    const current = get().currentGroup;
    let updated = current?.id === groupId ? current : null;
    const meId = useAuthStore.getState().user?.id;
    if (!updated?.members.some((m) => m.userId === meId)) {
      updated = await api.post<GroupRun>('/groups/join', { groupId });
    }
    if (!updated.members.find((m) => m.userId === meId)?.confirmed) {
      updated = await api.post<GroupRun>('/groups/confirm', { groupId });
    }
    const final = updated;
    set((s) => ({
      groups: s.groups.map((g) => (g.id === final.id ? final : g)),
      currentGroup: s.currentGroup?.id === final.id ? final : s.currentGroup,
    }));
  },

  leaveGroup: async (groupId) => {
    await api.post('/groups/leave', { groupId });
    set((s) => ({
      groups: s.groups.filter((g) => g.id !== groupId),
      currentGroup: s.currentGroup?.id === groupId ? null : s.currentGroup,
    }));
  },

  fetchLocations: (groupId) => api.get<MemberLocation[]>('/groups/locations', { groupId }),

  shareLocation: (groupId, latitude, longitude) =>
    api.post<{ arrived: boolean }>('/groups/location', { groupId, latitude, longitude }),

  fetchMeetingPoints: () => api.get<MeetingPoint[]>('/groups/meeting-points'),

  autoMatch: (data) => api.post<AutoMatchResult>('/groups/auto-match', data),
}));
