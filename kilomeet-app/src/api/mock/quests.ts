// Mock — Quest handlers
import type { Quest, QuestType } from '../types';
import { DAILY_QUEST_KM, DAILY_QUEST_REWARD, WEEKLY_QUEST_TOKEN_PER_KM } from '../types';
import { getCurrentUserId } from './data';

const today = new Date('2026-11-10');
const endOfDay = new Date(today);
endOfDay.setHours(23, 59, 59);
const endOfWeek = new Date(today);
endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));

function makeQuests(userId: string): Quest[] {
  const weeklyTargetKm = userId === 'user-minh' ? 44 : 2.2; // avg 4 weeks + 10%
  return [
    {
      id: `quest-daily-${userId}`,
      userId,
      type: 'daily',
      targetKm: DAILY_QUEST_KM,
      progressKm: userId === 'user-minh' ? 2 : 0,
      rewardTokens: DAILY_QUEST_REWARD,
      status: userId === 'user-minh' ? 'completed' : 'active',
      expiresAt: endOfDay.toISOString(),
      completedAt: userId === 'user-minh' ? today.toISOString() : null,
    },
    {
      id: `quest-weekly-${userId}`,
      userId,
      type: 'weekly',
      targetKm: Math.round(weeklyTargetKm * 10) / 10,
      progressKm: userId === 'user-minh' ? 42 : 0,
      rewardTokens: Math.round(weeklyTargetKm) * WEEKLY_QUEST_TOKEN_PER_KM,
      status: userId === 'user-minh' ? 'completed' : 'active',
      expiresAt: endOfWeek.toISOString(),
      completedAt: userId === 'user-minh' ? today.toISOString() : null,
    },
  ];
}

const questCache: Record<string, Quest[]> = {};

function getOrCreateQuests(userId: string): Quest[] {
  if (!questCache[userId]) questCache[userId] = makeQuests(userId);
  return questCache[userId];
}

export function mockGetQuests(params?: Record<string, string>): Quest[] {
  const userId = params?.userId ?? getCurrentUserId();
  return getOrCreateQuests(userId);
}

export function mockCompleteQuest(body: unknown): Quest {
  const { questId } = body as { questId: string };
  const userId = getCurrentUserId();
  const quests = getOrCreateQuests(userId);
  const quest = quests.find((q) => q.id === questId);
  if (!quest) throw new Error('Quest not found');
  if (quest.status !== 'active') throw new Error('Quest already completed or expired');
  quest.status = 'completed';
  quest.completedAt = new Date().toISOString();
  quest.progressKm = quest.targetKm;
  return quest;
}
