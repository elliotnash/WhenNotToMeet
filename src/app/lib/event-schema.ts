import { z } from 'zod';
import { DAY_MINUTES, SLOT_MINUTES, SLOT_MS, daysBetween, isValidTimeZone } from './time';

export const MAX_EVENT_DAYS = 90;
export const MAX_BUSY_BLOCKS = 1000;

const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date');
const minute = z.number().int().multipleOf(SLOT_MINUTES).min(0).max(DAY_MINUTES);

export const eventInputSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required').max(100),
    description: z.string().trim().max(1000).default(''),
    timezone: z.string().refine(isValidTimeZone, 'Unknown time zone'),
    startDate: dateKey,
    endDate: dateKey,
    dayStartMinute: minute,
    dayEndMinute: minute,
  })
  .refine((e) => e.dayEndMinute > e.dayStartMinute, {
    message: 'End time must be after start time',
    path: ['dayEndMinute'],
  })
  .refine((e) => e.endDate >= e.startDate, {
    message: 'End date must not be before start date',
    path: ['endDate'],
  })
  .refine((e) => daysBetween(e.startDate, e.endDate) < MAX_EVENT_DAYS, {
    message: `Events can span at most ${MAX_EVENT_DAYS} days`,
    path: ['endDate'],
  });

export type EventInput = z.input<typeof eventInputSchema>;

const slotTime = z
  .number()
  .int()
  .refine((ms) => ms % SLOT_MS === 0, 'Times must align to 15 minutes');

export const busyBlocksSchema = z
  .array(z.object({ start: slotTime, end: slotTime }).refine((b) => b.end > b.start))
  .max(MAX_BUSY_BLOCKS);

export const guestJoinSchema = z.object({
  token: z.string().min(1),
  name: z.string().trim().min(1, 'Name is required').max(50),
  password: z.string().min(4, 'Password must be at least 4 characters').max(128),
});
