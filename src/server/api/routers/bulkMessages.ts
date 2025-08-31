import { z } from 'zod';
import { createTRPCRouter, enforcePermission, privateProcedure } from '@/server/api/trpc';
import { BulkMessagesService } from '@/server/services/bulk-messages/bulk-messages.service';
import {
  GetDeliveryStatsByIdsSchema,
  ListBulkMessagesSchema,
} from '@/server/services/bulk-messages/schema/bulk-messages-read.schema';
import { SendBulkMessageSchema } from '@/server/services/bulk-messages/schema/bulk-messages-write.schema';

export const bulkMessagesRouter = createTRPCRouter({
  getById: privateProcedure
    .use(enforcePermission('bulkMessages', 'read'))
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const bulkMessageService = new BulkMessagesService({
        db: ctx.db,
        auth: ctx.auth,
      });
      return bulkMessageService.getById(input.id);
    }),
  getDeliveryById: privateProcedure
    .use(enforcePermission('bulkMessages', 'read'))
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const bulkMessageService = new BulkMessagesService({
        db: ctx.db,
        auth: ctx.auth,
      });
      return bulkMessageService.getDeliveryById(input.id);
    }),

  getAll: privateProcedure
    .use(enforcePermission('bulkMessages', 'read'))
    .input(ListBulkMessagesSchema)
    .query(async ({ ctx, input }) => {
      const bulkMessageService = new BulkMessagesService({
        db: ctx.db,
        auth: ctx.auth,
      });
      return bulkMessageService.list(input);
    }),
  getDeliveryStatsByIds: privateProcedure
    .use(enforcePermission('bulkMessages', 'read'))
    .input(GetDeliveryStatsByIdsSchema)
    .query(async ({ ctx, input }) => {
      const bulkMessageService = new BulkMessagesService({
        db: ctx.db,
        auth: ctx.auth,
      });
      return bulkMessageService.getDeliveryStatsByIds(input);
    }),
  sendBulkMessage: privateProcedure
    .use(enforcePermission('bulkMessages', 'create'))
    .input(SendBulkMessageSchema)
    .mutation(async ({ ctx, input }) => {
      const bulkMessageService = new BulkMessagesService({
        db: ctx.db,
        auth: ctx.auth,
      });
      return bulkMessageService.sendBulkMessage(input);
    }),

  retryDeliveries: privateProcedure
    .use(enforcePermission('bulkMessages', 'update'))
    .input(z.object({ deliveryIds: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const bulkMessageService = new BulkMessagesService({
        db: ctx.db,
        auth: ctx.auth,
      });
      return bulkMessageService.retryDeliveries(input.deliveryIds);
    }),
});
