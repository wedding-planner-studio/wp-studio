import { BaseService } from '../base-service';
import { TRPCError } from '@trpc/server';
import type { LimitUpdateRequest, FeatureName, LimitName } from '@/lib/types/features';
import type { ToggleOrganizationFeatureSchemaType   } from './schema/feature-management.schema';

export class FeatureManagementService extends BaseService {
  /**
   * Get all available features
   */
  async getAllFeatures() {
    return this.db.feature.findMany({
      where: { isActive: true },
      include: { featureFlag: true },
      orderBy: [{ name: 'asc' }],
    });
  }

  /**
   * Get all available limit types
   */
  async getAllLimitTypes() {
    return this.db.limitType.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get all feature flags
   */
  async getAllFeatureFlags() {
    return this.db.featureFlag.findMany({
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get organization feature configuration
   */
  async getOrganizationFeatureConfig(organizationId?: string) {
    const targetOrgId = organizationId || (await this.getOrgFromUserSession()).organizationId;

    const [features, limits, usage] = await Promise.all([
      this.db.organizationFeature.findMany({
        where: { organizationId: targetOrgId },
        include: { feature: { include: { featureFlag: true } } },
        orderBy: { feature: { name: 'asc' } },
      }),
      this.db.organizationLimit.findMany({
        where: { organizationId: targetOrgId },
        include: { limitType: true },
        orderBy: { limitType: { name: 'asc' } },
      }),
      this.db.organizationUsage.findMany({
        where: {
          organizationId: targetOrgId,
          periodStart: { lte: new Date() },
          periodEnd: { gte: new Date() },
        },
        include: { limitType: true },
      }),
    ]);

    return {
      features: features.map(f => ({
        ...f,
        configuration: f.configuration as Record<string, unknown> | undefined,
        enabledBy: f.enabledBy || undefined,
        feature: {
          ...f.feature,
          description: f.feature.description || undefined,
          featureFlagId: f.feature.featureFlagId || undefined,
          featureFlag: f.feature.featureFlag
            ? {
                ...f.feature.featureFlag,
                description: f.feature.featureFlag.description || undefined,
              }
            : undefined,
        },
      })),
      limits: limits.map(l => ({
        ...l,
        setBy: l.setBy || undefined,
        limitType: {
          ...l.limitType,
          description: l.limitType.description || undefined,
          unit: l.limitType.unit || undefined,
        },
      })),
      usage: usage.map(u => ({
        ...u,
        limitType: {
          ...u.limitType,
          description: u.limitType.description || undefined,
          unit: u.limitType.unit || undefined,
        },
      })),
    };
  }

  /**
   * Toggle a feature for an organization (Admin only)
   */
  async toggleOrganizationFeature(request: ToggleOrganizationFeatureSchemaType) {
    // Verify sudo permissions
    await this.throwIfNotSudo();

    const { organizationId, featureId, isEnabled, configuration } = request;

    // Verify feature exists
    const feature = await this.db.feature.findUnique({
      where: { id: featureId, isActive: true },
    });

    if (!feature) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Feature not found',
      });
    }

    // Verify organization exists
    const organization = await this.db.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Organization not found',
      });
    }

    if (isEnabled) {
      // Enable the feature
      return this.db.organizationFeature.upsert({
        where: {
          organizationId_featureId: {
            organizationId,
            featureId,
          },
        },
        update: {
          isEnabled: true,
          configuration: configuration as any,
          enabledAt: new Date(),
          enabledBy: this.auth.userId,
        },
        create: {
          organizationId,
          featureId,
          isEnabled: true,
          configuration: configuration as any,
          enabledBy: this.auth.userId,
        },
        include: { feature: true },
      });
    } else {
      // Disable the feature
      return this.db.organizationFeature.upsert({
        where: {
          organizationId_featureId: {
            organizationId,
            featureId,
          },
        },
        update: {
          isEnabled: false,
        },
        create: {
          organizationId,
          featureId,
          isEnabled: false,
        },
        include: { feature: true },
      });
    }
  }

  /**
   * Update organization limit (Admin only)
   */
  async updateOrganizationLimit(request: LimitUpdateRequest) {
    // Verify sudo permissions
    await this.throwIfNotSudo();

    const { organizationId, limitName, value } = request;

    // Verify limit type exists
    const limitType = await this.db.limitType.findUnique({
      where: { name: limitName, isActive: true },
    });

    if (!limitType) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Limit type not found',
      });
    }

    // Verify organization exists
    const organization = await this.db.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Organization not found',
      });
    }

    if (value < 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Limit value must be non-negative',
      });
    }

    return this.db.organizationLimit.upsert({
      where: {
        organizationId_limitTypeId: {
          organizationId,
          limitTypeId: limitType.id,
        },
      },
      update: {
        value,
        setBy: this.auth.userId,
      },
      create: {
        organizationId,
        limitTypeId: limitType.id,
        value,
        setBy: this.auth.userId,
      },
      include: { limitType: true },
    });
  }

  /**
   * Get all organizations with their feature configurations (Admin only)
   */
  async getAllOrganizationsFeatureConfig() {
    // Verify sudo permissions
    await this.throwIfNotSudo();

    const organizations = await this.db.organization.findMany({
      include: {
        organizationFeatures: {
          include: { feature: true },
        },
        organizationLimits: {
          include: { limitType: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return organizations;
  }

  /**
   * Get all organizations for dropdown selection (Admin only)
   */
  async getAllOrganizations() {
    // Verify sudo permissions
    await this.throwIfNotSudo();

    const organizations = await this.db.organization.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: 'asc' },
    });

    return organizations;
  }

  /**
   * Initialize default features and limits for a new organization
   */
  async initializeOrganizationDefaults(organizationId: string) {
    // Get default features (core features that should be enabled by default)
    const defaultFeatures = await this.db.feature.findMany({
      where: {
        isActive: true,
      },
    });

    // Get all limit types to set default values
    const limitTypes = await this.db.limitType.findMany({
      where: { isActive: true },
    });

    // Create default feature assignments
    const featurePromises = defaultFeatures.map(feature =>
      this.db.organizationFeature.create({
        data: {
          organizationId,
          featureId: feature.id,
          isEnabled: true,
        },
      })
    );

    // Create default limit assignments
    const limitPromises = limitTypes.map(limitType =>
      this.db.organizationLimit.create({
        data: {
          organizationId,
          limitTypeId: limitType.id,
          value: limitType.defaultValue,
        },
      })
    );

    await Promise.all([...featurePromises, ...limitPromises]);
  }

  /**
   * Increment usage for a specific limit
   */
  async incrementUsage(organizationId: string, limitName: LimitName, amount = 1) {
    const limitType = await this.db.limitType.findUnique({
      where: { name: limitName, isActive: true },
    });

    if (!limitType) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Limit type '${limitName}' not found`,
      });
    }

    // Get current billing period
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Update or create usage record
    await this.db.organizationUsage.upsert({
      where: {
        organizationId_limitTypeId_periodStart: {
          organizationId,
          limitTypeId: limitType.id,
          periodStart,
        },
      },
      update: {
        currentValue: {
          increment: amount,
        },
      },
      create: {
        organizationId,
        limitTypeId: limitType.id,
        currentValue: amount,
        periodStart,
        periodEnd,
      },
    });
  }

  /**
   * Check if organization can perform action (has feature and within limits)
   */
  async canPerformAction(
    organizationId: string,
    featureName?: FeatureName,
    limitName?: LimitName,
    requestedAmount = 1
  ): Promise<{ allowed: boolean; reason?: string }> {
    // Check feature requirement
    if (featureName) {
      const hasFeature = await this.db.organizationFeature.findFirst({
        where: {
          organizationId,
          feature: { name: featureName, isActive: true },
          isEnabled: true,
        },
      });

      if (!hasFeature) {
        return {
          allowed: false,
          reason: `Feature '${featureName}' is not enabled for this organization`,
        };
      }
    }

    // Check limit requirement
    if (limitName) {
      const config = await this.getOrganizationFeatureConfig(organizationId);
      const limit = config.limits.find(l => l.limitType.name === limitName);
      const usage = config.usage.find(u => u.limitType.name === limitName);

      if (!limit) {
        return {
          allowed: false,
          reason: `Limit '${limitName}' not configured for this organization`,
        };
      }

      const currentUsage = usage?.currentValue || 0;
      const remaining = limit.value - currentUsage;

      if (remaining < requestedAmount) {
        return {
          allowed: false,
          reason: `Insufficient capacity. ${remaining} remaining, ${requestedAmount} requested.`,
        };
      }
    }

    return { allowed: true };
  }
}
