import { EventStatus } from '@prisma/client';
import { VenuePurpose } from '@prisma/client';
import { z } from 'zod';

export const EventInputSchema = z.object({
  name: z.string().min(1).max(100),
  date: z.string().transform(str => {
    const date = new Date(str);
    // Set the time to 12:00:00 UTC to ensure it displays on the correct day in any timezone
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0)
    );
  }),
  endDate: z
    .string()
    .transform(str => {
      const date = new Date(str);
      // Set the time to 12:00:00 UTC to ensure it displays on the correct day in any timezone
      return new Date(
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0)
      );
    })
    .nullable()
    .optional(),
  startTime: z
    .string()
    .min(1, 'Start time is required')
    .max(5, 'Invalid time format')
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:mm format'),
  endTime: z
    .string()
    .min(1, 'End time is required')
    .max(5, 'Invalid time format')
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:mm format'),
  timezone: z
    .string()
    .min(1, 'Timezone is required')
    .max(50, 'Timezone name too long')
    .refine(tz => {
      try {
        Intl.DateTimeFormat(undefined, { timeZone: tz });
        return true;
      } catch (_e) {
        return false;
      }
    }, 'Invalid timezone identifier'),
  person1: z.string().min(1).max(100),
  person2: z.string().min(1).max(100),
  status: z.enum([EventStatus.ACTIVE, EventStatus.INACTIVE]).default(EventStatus.ACTIVE),
  venue: z
    .object({
      name: z.string().optional(),
      address: z.string().optional(),
      purpose: z.nativeEnum(VenuePurpose).default(VenuePurpose.MAIN),
    })
    .optional(),
  description: z.string().optional(),
});

// Event update schema includes id and makes all fields optional
export const EventUpdateSchema = z.object({
  id: z.string(),
  data: EventInputSchema.partial(),
});

export const EventDuplicateSchema = z.object({
  cloneFromId: z.string(),
  eventInput: EventInputSchema.partial().optional(),
  options: z.object({
    guestList: z.boolean().optional(),
    questions: z.boolean().optional(),
    shareAccess: z.boolean().optional(),
  }),
});

export type EventInputParams = z.infer<typeof EventInputSchema>;
export type EventUpdateParams = z.infer<typeof EventUpdateSchema>;
export type EventDuplicateParams = z.infer<typeof EventDuplicateSchema>;
