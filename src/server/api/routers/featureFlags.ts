import { z } from 'zod';
import { createTRPCRouter, privateProcedure, enforcePermission } from '@/server/api/trpc';
import { FeatureFlagService } from '@/server/services/feature-flags/feature-flags.service';

export const featureFlagsRouter = createTRPCRouter({
  hasAccess: privateProcedure
    .input(
      z.object({
        featureName: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const featureFlagService = new FeatureFlagService({
        db: ctx.db,
        auth: ctx.auth,
      });
      return featureFlagService.hasAccess(input.featureName);
    }),
  list: privateProcedure.use(enforcePermission('sudo', 'read')).query(async ({ ctx }) => {
    const featureFlagService = new FeatureFlagService({
      db: ctx.db,
      auth: ctx.auth,
    });
    return featureFlagService.list();
  }),
  getDetails: privateProcedure
    .use(enforcePermission('sudo', 'read'))
    .input(z.object({ featureName: z.string() }))
    .query(async ({ ctx, input }) => {
      const featureFlagService = new FeatureFlagService({
        db: ctx.db,
        auth: ctx.auth,
      });
      return featureFlagService.getFeatureFlagDetails(input.featureName);
    }),
  getAllOrganizations: privateProcedure
    .use(enforcePermission('sudo', 'read'))
    .query(async ({ ctx }) => {
      const featureFlagService = new FeatureFlagService({
        db: ctx.db,
        auth: ctx.auth,
      });
      return featureFlagService.getAllOrganizations();
    }),
  toggleGlobally: privateProcedure
    .use(enforcePermission('sudo', 'update'))
    .input(z.object({ featureName: z.string(), isEnabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const featureFlagService = new FeatureFlagService({
        db: ctx.db,
        auth: ctx.auth,
      });
      if (input.isEnabled) {
        return featureFlagService.enableGlobally(input.featureName);
      } else {
        return featureFlagService.disableGlobally(input.featureName);
      }
    }),
  toggleOrganizationOnWhitelist: privateProcedure
    .use(enforcePermission('sudo', 'update'))
    .input(
      z.object({ featureName: z.string(), organizationId: z.string(), isOnWhitelist: z.boolean() })
    )
    .mutation(async ({ ctx, input }) => {
      const featureFlagService = new FeatureFlagService({
        db: ctx.db,
        auth: ctx.auth,
      });
      if (input.isOnWhitelist) {
        return featureFlagService.whitelistOrganization(input.featureName, input.organizationId);
      } else {
        return featureFlagService.removeFromWhitelist(input.featureName, input.organizationId);
      }
    }),
  toggleOrganizationOnBlacklist: privateProcedure
    .use(enforcePermission('sudo', 'update'))
    .input(
      z.object({ featureName: z.string(), organizationId: z.string(), isOnBlacklist: z.boolean() })
    )
    .mutation(async ({ ctx, input }) => {
      const featureFlagService = new FeatureFlagService({
        db: ctx.db,
        auth: ctx.auth,
      });
      if (input.isOnBlacklist) {
        return featureFlagService.blacklistOrganization(input.featureName, input.organizationId);
      } else {
        return featureFlagService.removeFromBlacklist(input.featureName, input.organizationId);
      }
    }),
});
