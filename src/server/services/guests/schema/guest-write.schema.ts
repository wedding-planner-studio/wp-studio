import { GuestPriority } from '@prisma/client';
import { GuestStatus } from '@prisma/client';
import { GuestLanguage } from '@prisma/client';
import { z } from 'zod';

export const GuestInputSchema = z.object({
  eventId: z.string(),
  name: z.string().min(1).max(100),
  phone: z.string().min(1).max(20).optional().nullable(),
  numberOfGuests: z.number().int().min(1).default(1),
  additionalGuestNames: z.string().optional().nullable(),
  status: z
    .enum([GuestStatus.CONFIRMED, GuestStatus.PENDING, GuestStatus.DECLINED, GuestStatus.INACTIVE])
    .default(GuestStatus.PENDING),
  table: z.string().optional().nullable(),
  dietaryRestrictions: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  priority: z.nativeEnum(GuestPriority),
  inviter: z.string(),
  preferredLanguage: z.nativeEnum(GuestLanguage).default(GuestLanguage.SPANISH),
  guestGroupId: z.string().optional().nullable(),
});

export const GuestUpdateSchema = GuestInputSchema.partial().extend({ id: z.string() });

// Schema for bulk upload guest data
export const SingleGuestForBulkUploadInputSchema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().min(1).max(20),
  category: z.string(),
  priority: z.nativeEnum(GuestPriority),
  numberOfGuests: z.number().int().min(1).default(1),
  additionalGuestNames: z.string().optional().nullable(),
  status: z.enum([GuestStatus.CONFIRMED, GuestStatus.PENDING, GuestStatus.DECLINED]),
  table: z.string().optional(),
  dietaryRestrictions: z.string().optional(),
  notes: z.string().optional(),
  inviter: z.string(),
  preferredLanguage: z.nativeEnum(GuestLanguage).default(GuestLanguage.SPANISH),
});
// Schema for bulk upload guest data
export const BulkGuestInputSchema = z.object({
  eventId: z.string(),
  guests: z.array(SingleGuestForBulkUploadInputSchema),
});

export type GuestUpdateParams = z.infer<typeof GuestUpdateSchema>;
export type GuestInputParams = z.infer<typeof GuestInputSchema>;
export type BulkGuestInputParams = z.infer<typeof BulkGuestInputSchema>;
export type SingleGuestForBulkUploadInputParams = z.infer<
  typeof SingleGuestForBulkUploadInputSchema
>;
