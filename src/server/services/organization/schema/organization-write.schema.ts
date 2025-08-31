import { z } from 'zod';

export const AddEventManagerSchema = z.object({
  eventId: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  username: z.string(),
  password: z.string(),
});

export const ResetEventManagerPasswordSchema = z.object({
  eventManagerId: z.string(),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

export const UpdateOrganizationSchema = z.object({
  name: z.string(),
});

export type AddEventManagerSchemaType = z.infer<typeof AddEventManagerSchema>;
export type ResetEventManagerPasswordSchemaType = z.infer<typeof ResetEventManagerPasswordSchema>;
export type UpdateOrganizationSchemaType = z.infer<typeof UpdateOrganizationSchema>;
