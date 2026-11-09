// Mock — Group run handlers
import type { GroupRun, GroupMember } from '../types';
import { getCurrentUserId, MOCK_RUNNERS } from './data';

const minhMember: GroupMember = {
  userId: 'user-minh',
  userName: 'Trần Minh',
  rank: 'cao_thủ',
  confirmed: true,
  arrived: false,
  punctuality: 95,
};

const mockGroups: GroupRun[] = [
  {
    id: 'group-1',
    creatorId: 'user-minh',
    date: '2026-11-11',
    timeSlot: '05:30',
    meetingPoint: {
      name: 'Công viên Lê Thị Riêng',
      latitude: 10.772,
      longitude: 106.663,
    },
    distanceKm: 5,
    rankRange: 'within1',
    status: 'open',
    members: [
      minhMember,
      {
        userId: 'user-hoa',
        userName: 'Phạm Hoa',
        rank: 'kim_cương',
        confirmed: true,
        arrived: false,
        punctuality: 88,
      },
    ],
    maxMembers: 6,
  },
  {
    id: 'group-2',
    creatorId: 'user-tuan',
    date: '2026-11-12',
    timeSlot: '17:30',
    meetingPoint: {
      name: 'Sân vận động Phú Thọ',
      latitude: 10.762,
      longitude: 106.658,
    },
    distanceKm: 8,
    rankRange: 'within2',
    status: 'open',
    members: [
      {
        userId: 'user-tuan',
        userName: 'Lê Tuấn',
        rank: 'bạch_kim',
        confirmed: true,
        arrived: false,
        punctuality: 92,
      },
      {
        userId: 'user-mai',
        userName: 'Ngô Mai',
        rank: 'vàng',
        confirmed: false,
        arrived: false,
        punctuality: 85,
      },
    ],
    maxMembers: 4,
  },
  {
    id: 'group-3',
    creatorId: 'user-minh',
    date: '2026-11-13',
    timeSlot: '06:00',
    meetingPoint: {
      name: 'Fuji Coffee (đối tác)',
      latitude: 10.773,
      longitude: 106.660,
    },
    distanceKm: 10,
    rankRange: 'same',
    status: 'open',
    members: [minhMember],
    maxMembers: 6,
  },
];

export function mockGetGroups(params?: Record<string, string>): GroupRun[] {
  if (params?.userId) {
    return mockGroups.filter((g) => g.members.some((m) => m.userId === params.userId));
  }
  return mockGroups;
}

export function mockCreateGroup(body: unknown): GroupRun {
  const userId = getCurrentUserId();
  const { date, timeSlot, meetingPoint, distanceKm, rankRange } = body as {
    date: string;
    timeSlot: string;
    meetingPoint: { name: string; latitude: number; longitude: number };
    distanceKm: number;
    rankRange: GroupRun['rankRange'];
  };

  const runner = MOCK_RUNNERS[userId];
  const group: GroupRun = {
    id: `group-${Date.now()}`,
    creatorId: userId,
    date,
    timeSlot: timeSlot as GroupRun['timeSlot'],
    meetingPoint,
    distanceKm,
    rankRange,
    status: 'open',
    members: [
      {
        userId,
        userName: runner?.name ?? 'Unknown',
        rank: runner?.rank ?? 'đồng',
        confirmed: true,
        arrived: false,
        punctuality: runner?.punctuality ?? 100,
      },
    ],
    maxMembers: 6,
  };
  mockGroups.push(group);
  return group;
}

export function mockJoinGroup(body: unknown): GroupRun {
  const userId = getCurrentUserId();
  const { groupId } = body as { groupId: string };
  const group = mockGroups.find((g) => g.id === groupId);
  if (!group) throw new Error('Nhóm không tồn tại');
  if (group.members.length >= group.maxMembers) throw new Error('Nhóm đã đầy');
  if (group.members.some((m) => m.userId === userId)) throw new Error('Bạn đã trong nhóm');

  const runner = MOCK_RUNNERS[userId];
  group.members.push({
    userId,
    userName: runner?.name ?? 'Unknown',
    rank: runner?.rank ?? 'đồng',
    confirmed: false,
    arrived: false,
    punctuality: runner?.punctuality ?? 100,
  });
  return group;
}

export function mockGetGroupDetail(params?: Record<string, string>): GroupRun {
  const groupId = params?.groupId;
  const group = mockGroups.find((g) => g.id === groupId);
  if (!group) throw new Error('Nhóm không tồn tại');
  return group;
}
