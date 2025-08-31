import { MessageCreditType, MessageCreditPool, EventStatus } from '@prisma/client';
import { BaseService, BaseServiceOptions } from '../base-service';
import { PLANS } from '@/lib/utils/constants';
import { UsageListSchemaType } from './schema/usage-read.schema';
import { LIMIT_DEFINITIONS, LimitName } from '@/lib/types/features';

export class UsageService extends BaseService {
  /**
   * Calculate usage for a specific limit type from actual database records
   */
  private async calculateLimitUsage(organizationId: string, limitName: LimitName): Promise<number> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    switch (limitName) {
      case 'activeEvents':
        return await this.db.event.count({
          where: {
            organizationId,
            status: EventStatus.ACTIVE,
          },
        });

      case 'whatsappMsgs':
        const consumedThisMonth = await this.db.organizationMessageCredits.aggregate({
          where: {
            organizationId,
            type: MessageCreditType.CONSUMPTION,
            createdAt: { gte: startOfMonth },
          },
          _sum: { credits: true },
        });
        return Math.abs(consumedThisMonth._sum.credits ?? 0);
      default:
        return 0;
    }
  }

  /**
   * Get comprehensive usage for all limits for an organization
   */
  async getComprehensiveUsage(organizationId: string) {
    // Calculate usage for all limit types
    const usagePromises = Object.entries(LIMIT_DEFINITIONS).map(async ([limitName, definition]) => {
      const usage = await this.calculateLimitUsage(organizationId, limitName as LimitName);

      // Get custom limit if set, otherwise use plan default
      const customLimit = await this.db.organizationLimit.findUnique({
        where: {
          organizationId_limitTypeId: {
            organizationId,
            limitTypeId: await this.getLimitTypeId(limitName),
          },
        },
      });

      const limit = customLimit?.value ?? this.getDefaultLimits(limitName as LimitName);

      return {
        limitName,
        definition,
        usage,
        limit,
        percentage: limit > 0 ? Math.round((usage / limit) * 100) : 0,
        isOverLimit: usage > limit,
      };
    });

    const allUsage = await Promise.all(usagePromises);

    return {
      organizationId,
      limits: allUsage.reduce(
        (acc, item) => {
          acc[item.limitName] = {
            usage: item.usage,
            limit: item.limit,
            percentage: item.percentage,
            isOverLimit: item.isOverLimit,
            definition: item.definition,
          };
          return acc;
        },
        {} as Record<string, any>
      ),
    };
  }

  /**
   * Helper to get limit type ID by name
   */
  private async getLimitTypeId(limitName: string): Promise<string> {
    const limitType = await this.db.limitType.findUnique({
      where: { name: limitName },
      select: { id: true },
    });

    if (!limitType) {
      throw new Error(`Limit type not found: ${limitName}`);
    }

    return limitType.id;
  }

  /**
   * Helper to get plan limit for a specific limit type
   */
  private getDefaultLimits(limitName: LimitName): number {
    switch (limitName) {
      case 'activeEvents':
        return typeof LIMIT_DEFINITIONS[limitName].defaultValue === 'number'
          ? LIMIT_DEFINITIONS[limitName].defaultValue
          : 0;
      case 'whatsappMsgs':
        return typeof LIMIT_DEFINITIONS[limitName].defaultValue === 'number'
          ? LIMIT_DEFINITIONS[limitName].defaultValue
          : 0;
      default:
        return 0;
    }
  }

  /**
   * Get the usage for an organization (legacy method - keeping for backward compatibility)
   */
  async getUsageByOrganizationId() {
    const { organizationId, plan } = await this.getOrgFromUserSession();
    const monthlyLimit = PLANS[plan].limits.whatsappMsgs;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      consumedAllowanceMonthlyAgg,
      consumedPurchasedLifetimeAgg,
      purchasedLifetimeAgg,
      consumedPurchasedMonthlyAgg,
    ] = await Promise.all([
      this.db.organizationMessageCredits.aggregate({
        where: {
          organizationId,
          type: MessageCreditType.CONSUMPTION,
          consumedFromPool: MessageCreditPool.ALLOWANCE,
          createdAt: { gte: startOfMonth },
        },
        _sum: { credits: true },
      }),
      this.db.organizationMessageCredits.aggregate({
        where: {
          organizationId,
          type: MessageCreditType.CONSUMPTION,
          consumedFromPool: MessageCreditPool.PURCHASED,
        },
        _sum: { credits: true },
      }),
      this.db.organizationMessageCredits.aggregate({
        where: { organizationId, type: MessageCreditType.TOP_UP },
        _sum: { credits: true },
      }),
      this.db.organizationMessageCredits.aggregate({
        where: {
          organizationId,
          type: MessageCreditType.CONSUMPTION,
          consumedFromPool: MessageCreditPool.PURCHASED,
          createdAt: { gte: startOfMonth },
        },
        _sum: { credits: true },
      }),
    ]);

    const consumedFromAllowanceThisMonth = -1 * (consumedAllowanceMonthlyAgg._sum.credits ?? 0);
    const totalLifetimePurchased = purchasedLifetimeAgg._sum.credits ?? 0;
    const totalLifetimeConsumedFromPurchased =
      -1 * (consumedPurchasedLifetimeAgg._sum.credits ?? 0);
    const consumedFromPurchasedThisMonth = -1 * (consumedPurchasedMonthlyAgg._sum.credits ?? 0);

    const purchasedCreditsRemaining = Math.max(
      0,
      totalLifetimePurchased - totalLifetimeConsumedFromPurchased
    );
    const monthlyAllowanceRemaining = Math.max(0, monthlyLimit - consumedFromAllowanceThisMonth);
    const totalRemaining = monthlyAllowanceRemaining + purchasedCreditsRemaining;

    const consumedThisMonth = consumedFromAllowanceThisMonth + consumedFromPurchasedThisMonth;

    // Events
    const currentEvents = await this.db.event.count({
      where: {
        organizationId,
        status: EventStatus.ACTIVE,
      },
    });

    return {
      messages: {
        monthlyLimit,
        consumedThisMonth,
        consumedFromAllowanceThisMonth,
        consumedFromPurchasedThisMonth,
        monthlyAllowanceRemaining,
        purchasedCreditsRemaining,
        totalRemaining,
      },
      events: {
        limit: PLANS[plan].limits.activeEvents,
        current: currentEvents,
      },
    };
  }

  async listUsageByOrganizationId(params: UsageListSchemaType) {
    const { organizationId } = await this.getOrgFromUserSession();
    const { limit, offset, orderDirection } = params;

    const whereClause = { organizationId };

    // Fetch the paginated list
    const usage = await this.db.organizationMessageCredits.findMany({
      where: whereClause,
      orderBy: { createdAt: orderDirection ?? 'desc' },
      take: limit,
      skip: offset,
    });

    // Fetch the total count separately
    const totalCount = await this.db.organizationMessageCredits.count({ where: whereClause });
    return { usage, totalCount };
  }
}
