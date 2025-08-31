import { BaseService } from '../base-service';
import { clerkClient } from '@clerk/clerk-sdk-node';
import {
  AddEventManagerSchemaType,
  ResetEventManagerPasswordSchemaType,
  UpdateOrganizationSchemaType,
} from './schema/organization-write.schema';
import { TRPCError } from '@trpc/server';
import { UserRole, UserStatus } from '@prisma/client';
export class OrganizationService extends BaseService {
  /**
   * Get the organization for the current user
   * @returns The organization
   */
  async getOrganization() {
    const { organizationId, plan } = await this.getOrgFromUserSession();
    const organization = await this.db.organization.findUnique({
      where: { id: organizationId },
    });
    return { organization, plan };
  }
  /**
   * List all event managers for the organization
   * @returns A list of event managers
   */
  async listEventManagers(eventId: string) {
    this.throwIfNotOrgAdmin();
    const { organizationId } = await this.getOrgFromUserSession();
    const eventManagers = await this.db.user.findMany({
      where: {
        organizationId,
        role: UserRole.EVENT_MANAGER,
        status: UserStatus.ACTIVE,
        managedEvents: { some: { eventId } },
      },
    });
    return eventManagers;
  }
  /**
   * Add an event manager to the organization
   * @param input - The input schema
   * @returns The created event manager
   */
  async addEventManager(input: AddEventManagerSchemaType) {
    try {
      this.throwIfNotOrgAdmin();
      const { organizationId } = await this.getOrgFromUserSession();
      const event = await this.db.event.findUnique({
        where: { id: input.eventId, organizationId, status: UserStatus.ACTIVE },
      });
      if (!event) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Event not found or not authorized' });
      }

      const existingClerkUser = await this.db.user.findFirst({
        where: { username: input.username },
      });

      if (existingClerkUser) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Username already exists' });
      }

      const clerkUser = await clerkClient.users.createUser({
        firstName: input.firstName,
        lastName: input.lastName,
        username: input.username,
        password: input.password,
        skipPasswordChecks: true,
        privateMetadata: {
          organizationId,
          eventId: input.eventId,
        },
      });

      if (!clerkUser) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Error creating user' });
      }

      const couple = await this.db.user.create({
        data: {
          id: clerkUser.id,
          role: UserRole.EVENT_MANAGER,
          username: clerkUser.username ?? '',
          email: clerkUser.emailAddresses?.[0]?.emailAddress ?? null,
          firstName: clerkUser.firstName ?? null,
          lastName: clerkUser.lastName ?? null,
          phone: clerkUser.phoneNumbers?.[0]?.phoneNumber ?? null,
          attributes: JSON.stringify(clerkUser),
          organizationId,
          managedEvents: {
            create: {
              eventId: input.eventId,
            },
          },
        },
        select: {
          id: true,
          username: true,
          role: true,
        },
      });
      return couple;
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      if ((error as any)?.errors) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: (error as any)?.errors?.[0]?.message,
          cause: {
            code: 'VALIDATION',
            errors: (error as any)?.errors,
          },
        });
      }
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Error adding event manager' });
    }
  }

  async softDeleteEventManager(eventManagerId: string) {
    this.throwIfNotOrgAdmin();
    const { organizationId } = await this.getOrgFromUserSession();
    await this.db.user.update({
      where: { id: eventManagerId, organizationId },
      data: { status: UserStatus.INACTIVE },
    });
  }

  async resetEventManagerPassword(input: ResetEventManagerPasswordSchemaType) {
    this.throwIfNotOrgAdmin();
    const { organizationId } = await this.getOrgFromUserSession();
    const eventManager = await this.db.user.findUnique({
      where: { id: input.eventManagerId, organizationId },
    });
    if (!eventManager) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Event manager not found' });
    }
    const clerkUser = await clerkClient.users.updateUser(eventManager.id, {
      password: input.newPassword,
      skipPasswordChecks: true,
      privateMetadata: {
        organizationId,
      },
    });
    if (!clerkUser) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Error resetting event manager password',
      });
    }
    return clerkUser;
  }

  /**
   * Update the organization
   * @param input - The input schema
   */
  async updateOrganization(input: UpdateOrganizationSchemaType) {
    this.throwIfNotOrgAdmin();
    const { organizationId } = await this.getOrgFromUserSession();
    await this.db.organization.update({
      where: { id: organizationId },
      data: input,
    });
  }

  /**
   * List all members of the organization
   * @returns A list of members
   */
  async listMembers() {
    const { organizationId } = await this.getOrgFromUserSession();
    const members = await this.db.user.findMany({
      where: { organizationId },
      select: {
        id: true,
        username: true,
        role: true,
        status: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });
    return members;
  }
}
