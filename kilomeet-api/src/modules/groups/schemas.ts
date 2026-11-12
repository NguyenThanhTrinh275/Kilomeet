import { z } from 'zod';
import { GROUP_TIME_SLOTS } from '../../contract/schemas.js';

const groupId = z.string({ error: 'Thiếu groupId' }).min(1, 'Thiếu groupId');
const rankRange = z.enum(['same', 'within1', 'within2', 'any'], { error: 'Phạm vi hạng không hợp lệ' });
const date = z.iso.date({ error: 'Ngày không hợp lệ (YYYY-MM-DD)' });
const slot = z.enum(GROUP_TIME_SLOTS, { error: 'Khung giờ không hợp lệ' });
const lat = z.number({ error: 'Toạ độ không hợp lệ' }).min(-90).max(90);
const lng = z.number({ error: 'Toạ độ không hợp lệ' }).min(-180).max(180);

export const GroupIdBody = z.object({ groupId });
export const GroupIdQuery = z.object({ groupId });
export const ListQuery = z.object({ userId: z.string().optional() });

export const CreateGroupBody = z.object({
  date,
  timeSlot: slot,
  meetingPoint: z.object({
    name: z.string({ error: 'Vui lòng chọn điểm hội tụ' }).trim().min(1, 'Vui lòng chọn điểm hội tụ'),
    latitude: lat,
    longitude: lng,
  }, { error: 'Vui lòng chọn điểm hội tụ' }),
  distanceKm: z.number({ error: 'Quãng đường không hợp lệ' }).positive('Quãng đường không hợp lệ').max(50, 'Quãng đường không hợp lệ'),
  rankRange,
  minPunctuality: z.number().int().min(0).max(100).optional(),
});

export const AutoMatchBody = z.object({
  date,
  timeSlots: z.array(slot).min(1, 'Chọn ít nhất 1 khung giờ'),
  distanceKm: z.number({ error: 'Quãng đường không hợp lệ' }).positive('Quãng đường không hợp lệ').max(50),
  rankRange,
  latitude: lat,
  longitude: lng,
});

export const LocationBody = z.object({ groupId, latitude: lat, longitude: lng });
