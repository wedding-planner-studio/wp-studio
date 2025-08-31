import { UsageService } from '@/server/services/usage/usage-service';
import { createTRPCRouter, privateProcedure, enforcePermission } from '../trpc';
import {
  UsageListSchema,
  UsageComprehensiveSchema,
} from '@/server/services/usage/schema/usage-read.schema';

export const usageRouter = createTRPCRouter({
  getUsage: privateProcedure
    .use(enforcePermission('orgMsgUsage', 'read'))
    .input(UsageListSchema)
    .query(async ({ ctx, input }) => {
      const usageService = new UsageService({
        db: ctx.db,
        auth: ctx.auth,
      });
      const usage = await usageService.listUsageByOrganizationId(input);
      return usage;
    }),
  getComprehensiveUsage: privateProcedure
    .use(enforcePermission('orgMsgUsage', 'read'))
    .input(UsageComprehensiveSchema)
    .query(async ({ ctx, input }) => {
      const usageService = new UsageService({
        db: ctx.db,
        auth: ctx.auth,
      });
      return usageService.getComprehensiveUsage(input.organizationId);
    }),
});
