import { z } from 'zod';

export const SendBulkMessageSchema = z.object({
  eventId: z.string(),
  templateSid: z.string(),
  templateName: z.string(),
  name: z.string(),
  guestIds: z.array(z.string()),
  variables: z.record(z.string(), z.string()).optional(),
  mediaFiles: z
    .array(
      z.object({
        filename: z.string(),
        fileKey: z.string(),
        fileUrl: z.string(),
        fileSize: z.number(),
        fileType: z.string(),
      })
    )
    .optional(),
});

export type SendBulkMessageParams = z.infer<typeof SendBulkMessageSchema>;
