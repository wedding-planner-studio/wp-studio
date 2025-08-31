import { OrganizationPlan, type Prisma, type PrismaClient, UserRole } from '@prisma/client';
import type { DefaultArgs } from '@prisma/client/runtime/library';
import { TRPCError } from '@trpc/server';
import { Redis } from '@upstash/redis';

export type Connection = Omit<
  PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

export interface BaseServiceOptions {
  db: Connection;
  auth: { userId: string; role: UserRole };
}

export class BaseService {
  protected db: Connection;
  protected auth: { userId: string; role: UserRole };
  protected redis: Redis;

  constructor(options: BaseServiceOptions) {
    this.db = options.db;
    this.auth = options.auth;
    this.redis = Redis.fromEnv();
  }

  /**
   * Get the organization ID from the authenticated user
   * @returns { organizationId: string }
   * @throws { TRPCError } if the user is not associated with an organization
   */
  protected async getOrgFromUserSession(): Promise<{
    organizationId: string;
    plan: OrganizationPlan;
  }> {
    // Get the organization ID from the authenticated user
    const user = await this.db.user.findFirst({
      where: { id: this.auth.userId },
      select: { organizationId: true, organization: { select: { plan: true } } },
    });

    if (!user?.organizationId || !user.organization?.plan) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'User not associated with an organization',
      });
    }

    return {
      organizationId: user.organizationId,
      plan: user.organization.plan,
    };
  }

  /**
   * Throw UNAUTHORIZED error if the user is not an organization admin
   * @throws { TRPCError } if the user is not an organization admin
   */
  protected throwIfNotOrgAdmin() {
    if (this.auth.role !== UserRole.ORG_ADMIN && this.auth.role !== UserRole.SUDO) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'User does not have permission to perform this action',
      });
    }
  }

  /**
   * Throw UNAUTHORIZED error if the user is not an organization sudo user
   * @throws { TRPCError } if the user is not an organization sudo user
   */
  protected throwIfNotSudo() {
    if (this.auth.role !== UserRole.SUDO) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'User does not have permission to perform this action',
      });
    }
  }
}
