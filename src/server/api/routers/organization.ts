import { createTRPCRouter, enforcePermission, privateProcedure } from '@/server/api/trpc';
import {
  AddEventManagerSchema,
  ResetEventManagerPasswordSchema,
  UpdateOrganizationSchema,
} from '@/server/services/organization/schema/organization-write.schema';
import { OrganizationService } from '@/server/services/organization/organization.service';
import { UsageService } from '@/server/services/usage/usage-service';
import { z } from 'node_modules/zod/lib';

export const organizationRouter = createTRPCRouter({
  get: privateProcedure.query(async ({ ctx }) => {
    const organizationService = new OrganizationService({
      db: ctx.db,
      auth: ctx.auth,
    });
    return organizationService.getOrganization();
  }),
  usage: privateProcedure.query(async ({ ctx }) => {
    const usageService = new UsageService({
      db: ctx.db,
      auth: ctx.auth,
    });
    return usageService.getUsageByOrganizationId();
  }),
  listEventManagers: privateProcedure
    .use(enforcePermission('admin', 'read'))
    .input(z.object({ eventId: z.string() }))
    .query(async ({ ctx, input }) => {
      const organizationService = new OrganizationService({
        db: ctx.db,
        auth: ctx.auth,
      });
      return organizationService.listEventManagers(input.eventId);
    }),
  addEventManager: privateProcedure
    .use(enforcePermission('admin', 'create'))
    .input(AddEventManagerSchema)
    .mutation(async ({ ctx, input }) => {
      const organizationService = new OrganizationService({
        db: ctx.db,
        auth: ctx.auth,
      });
      return organizationService.addEventManager(input);
    }),
  softDeleteEventManager: privateProcedure
    .use(enforcePermission('admin', 'delete'))
    .input(z.object({ eventManagerId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const organizationService = new OrganizationService({
        db: ctx.db,
        auth: ctx.auth,
      });
      return organizationService.softDeleteEventManager(input.eventManagerId);
    }),
  resetEventManagerPassword: privateProcedure
    .use(enforcePermission('admin', 'update'))
    .input(ResetEventManagerPasswordSchema)
    .mutation(async ({ ctx, input }) => {
      const organizationService = new OrganizationService({
        db: ctx.db,
        auth: ctx.auth,
      });
      return organizationService.resetEventManagerPassword(input);
    }),
  updateOrganization: privateProcedure
    .use(enforcePermission('admin', 'update'))
    .input(UpdateOrganizationSchema)
    .mutation(async ({ ctx, input }) => {
      const organizationService = new OrganizationService({
        db: ctx.db,
        auth: ctx.auth,
      });
      return organizationService.updateOrganization(input);
    }),
  listMembers: privateProcedure.use(enforcePermission('admin', 'read')).query(async ({ ctx }) => {
    const organizationService = new OrganizationService({
      db: ctx.db,
      auth: ctx.auth,
    });
    return organizationService.listMembers();
  }),
});
