import { VenuePurpose } from '@prisma/client';
import { z } from 'zod';

export const CreateVenueSchema = z.object({
  eventId: z.string(),
  name: z.string().min(1),
  address: z.string().optional(),
  purpose: z.nativeEnum(VenuePurpose),
});

export const UpdateVenueSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  address: z.string().optional(),
  purpose: z.nativeEnum(VenuePurpose).optional(),
});

export type CreateVenueParams = z.infer<typeof CreateVenueSchema>;
export type UpdateVenueParams = z.infer<typeof UpdateVenueSchema>;
