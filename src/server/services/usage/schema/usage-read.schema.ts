import { z } from 'zod';

export const UsageReadSchema = z.object({
  organizationId: z.string(),
});

export const UsageListSchema = z.object({
  limit: z.number().optional(),
  offset: z.number().optional(),
  orderDirection: z.enum(['asc', 'desc']).optional(),
});

export const UsageComprehensiveSchema = z.object({
  organizationId: z.string(),
});

export type UsageReadSchemaType = z.infer<typeof UsageReadSchema>;
export type UsageListSchemaType = z.infer<typeof UsageListSchema>;
export type UsageComprehensiveSchemaType = z.infer<typeof UsageComprehensiveSchema>;
