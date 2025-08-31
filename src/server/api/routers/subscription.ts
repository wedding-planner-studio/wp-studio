import { SubscriptionManager } from '@/server/services/subscription/subscription-manager';
import { createTRPCRouter, privateProcedure, enforcePermission } from '../trpc';
import { z } from 'zod';
import { OrganizationPlan } from '@prisma/client';

export const subscriptionRouter = createTRPCRouter({
  update: privateProcedure
    .use(enforcePermission('subscription', 'update'))
    .input(z.object({ plan: z.nativeEnum(OrganizationPlan) }))
    .mutation(async ({ ctx, input }) => {
      const subscriptionManager = new SubscriptionManager({
        db: ctx.db,
        auth: ctx.auth,
      });
      return subscriptionManager.update(input.plan);
    }),
});
