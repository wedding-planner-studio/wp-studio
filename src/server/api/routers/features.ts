import { z } from 'zod';
import { createTRPCRouter, privateProcedure, enforcePermission } from '@/server/api/trpc';
import { FeatureManagementService } from '@/server/services/features/feature-management.service';
import { ToggleOrganizationFeatureSchema } from '@/server/services/features/schema/feature-management.schema';
import type { FeatureName } from '@/lib/types/features';
import { LimitName } from '@/lib/types/features';

export const featuresRouter = createTRPCRouter({
  // Get all available features (Admin only)
  getAllFeatures: privateProcedure
    .use(enforcePermission('admin', 'read'))
    .query(async ({ ctx }) => {
      const service = new FeatureManagementService({ db: ctx.db, auth: ctx.auth });
      return service.getAllFeatures();
    }),

  // Get all available limit types (Admin only)
  getAllLimitTypes: privateProcedure
    .use(enforcePermission('admin', 'read'))
    .query(async ({ ctx }) => {
      const service = new FeatureManagementService({ db: ctx.db, auth: ctx.auth });
      return service.getAllLimitTypes();
    }),

  // Get all feature flags (Admin only)
  getAllFeatureFlags: privateProcedure
    .use(enforcePermission('admin', 'read'))
    .query(async ({ ctx }) => {
      const service = new FeatureManagementService({ db: ctx.db, auth: ctx.auth });
      return service.getAllFeatureFlags();
    }),
  // Get organization feature configuration
  getOrganizationConfig: privateProcedure
    .input(
      z.object({
        organizationId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const service = new FeatureManagementService({ db: ctx.db, auth: ctx.auth });
      return service.getOrganizationFeatureConfig(input.organizationId);
    }),

  // Toggle organization feature (Admin only)
  toggleOrganizationFeature: privateProcedure
    .use(enforcePermission('admin', 'update'))
    .input(ToggleOrganizationFeatureSchema)
    .mutation(async ({ ctx, input }) => {
      const service = new FeatureManagementService({ db: ctx.db, auth: ctx.auth });
      return service.toggleOrganizationFeature(input);
    }),

  // Update organization limit (Admin only)
  updateOrganizationLimit: privateProcedure
    .use(enforcePermission('admin', 'update'))
    .input(
      z.object({
        organizationId: z.string(),
        limitName: z.nativeEnum(LimitName),
        value: z.number().min(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const service = new FeatureManagementService({ db: ctx.db, auth: ctx.auth });
      return service.updateOrganizationLimit(input);
    }),

  // Get all organizations with feature configs (Admin only)
  getAllOrganizationsConfig: privateProcedure
    .use(enforcePermission('admin', 'read'))
    .query(async ({ ctx }) => {
      const service = new FeatureManagementService({ db: ctx.db, auth: ctx.auth });
      return service.getAllOrganizationsFeatureConfig();
    }),

  // Get all organizations for dropdown (Admin only)
  getAllOrganizations: privateProcedure
    .use(enforcePermission('admin', 'read'))
    .query(async ({ ctx }) => {
      const service = new FeatureManagementService({ db: ctx.db, auth: ctx.auth });
      return service.getAllOrganizations();
    }),

  // Check if organization can perform an action
  canPerformAction: privateProcedure
    .input(
      z.object({
        organizationId: z.string().optional(),
        featureName: z.string().optional(),
        limitName: z.string().optional(),
        requestedAmount: z.number().default(1),
      })
    )
    .query(async ({ ctx, input }) => {
      const service = new FeatureManagementService({ db: ctx.db, auth: ctx.auth });
      const orgId = input.organizationId || ctx.auth.userId; // This would need to be fixed to get org from user
      return service.canPerformAction(
        orgId,
        input.featureName as FeatureName | undefined,
        input.limitName as LimitName | undefined,
        input.requestedAmount
      );
    }),

  // Increment usage for a limit
  incrementUsage: privateProcedure
    .use(enforcePermission('sudo', 'update'))
    .input(
      z.object({
        organizationId: z.string().optional(),
        limitName: z.string(),
        amount: z.number().default(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const service = new FeatureManagementService({ db: ctx.db, auth: ctx.auth });
      const orgId = input.organizationId || ctx.auth.userId; // This would need to be fixed to get org from user
      return service.incrementUsage(orgId, input.limitName as LimitName, input.amount);
    }),

  // Initialize default features for new organization
  initializeDefaults: privateProcedure
    .use(enforcePermission('sudo', 'create'))
    .input(
      z.object({
        organizationId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const service = new FeatureManagementService({ db: ctx.db, auth: ctx.auth });
      return service.initializeOrganizationDefaults(input.organizationId);
    }),
});
