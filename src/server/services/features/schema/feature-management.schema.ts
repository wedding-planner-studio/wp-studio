import { z } from 'zod';

export const ToggleOrganizationFeatureSchema = z.object({
  organizationId: z.string(),
  featureId: z.string(),
  isEnabled: z.boolean(),
  configuration: z.record(z.unknown()).optional(),
});

export type ToggleOrganizationFeatureSchemaType = z.infer<typeof ToggleOrganizationFeatureSchema>;
