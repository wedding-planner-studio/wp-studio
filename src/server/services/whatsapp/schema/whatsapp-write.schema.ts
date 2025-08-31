import { z } from 'zod';

export const createWhatsAppTemplateSchema = z.object({
  name: z.string(),
  category: z.string(),
  language: z.string(),
  content: z.string(),
  sample: z.string().optional(),
  includeMedia: z.boolean(),
  mediaFileType: z.string().optional(),
});

export type CreateWhatsAppTemplateType = z.infer<typeof createWhatsAppTemplateSchema>;
