import { FeatureFlag, PrismaClient } from '@prisma/client';
import { BaseService } from '../base-service';

export class FeatureFlagService extends BaseService {
  /**
   * List all feature flags
   * @returns Promise<FeatureFlag[]> - All feature flags
   */
  async list(): Promise<FeatureFlag[]> {
    this.throwIfNotSudo();
    return this.db.featureFlag.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }
  /**
   * Check if an organization has access to a feature
   * @param featureName - Name of the feature to check
   * @param organizationId - ID of the organization
   * @returns Promise<boolean> - Whether the organization has access to the feature
   */
  async hasAccess(featureName: string): Promise<boolean> {
    const { organizationId } = await this.getOrgFromUserSession();
    // If no feature name is provided, access is denied
    if (!featureName) return false;

    // Get the feature flag
    const featureFlag = await this.db.featureFlag.findUnique({
      where: { name: featureName },
    });

    // If feature flag doesn't exist, the feature is accessible to everyone
    if (!featureFlag) return true;

    // Check if the organization is blacklisted (blacklist takes precedence)
    const isBlacklisted = await this.db.featureFlagOrgBlacklist.findUnique({
      where: {
        featureFlagId_organizationId: {
          featureFlagId: featureFlag.id,
          organizationId,
        },
      },
    });

    // If blacklisted, deny access regardless of other settings
    if (isBlacklisted) return false;

    // If feature is globally enabled and not blacklisted, allow access
    if (featureFlag.isGloballyEnabled) return true;

    // If not globally enabled, check if organization is whitelisted
    const isWhitelisted = await this.db.featureFlagOrgWhitelist.findUnique({
      where: {
        featureFlagId_organizationId: {
          featureFlagId: featureFlag.id,
          organizationId,
        },
      },
    });

    // Organization has access only if whitelisted
    return !!isWhitelisted;
  }

  /**
   * Enable a feature flag globally
   */
  async enableGlobally(featureName: string): Promise<void> {
    this.throwIfNotSudo();
    await this.db.featureFlag.update({
      where: { name: featureName },
      data: { isGloballyEnabled: true },
    });
  }

  /**
   * Disable a feature flag globally
   */
  async disableGlobally(featureName: string): Promise<void> {
    this.throwIfNotSudo();
    await this.db.featureFlag.update({
      where: { name: featureName },
      data: { isGloballyEnabled: false },
    });
  }

  /**
   * Whitelist an organization for a feature
   */
  async whitelistOrganization(featureName: string, organizationId: string): Promise<void> {
    this.throwIfNotSudo();
    const featureFlag = await this.db.featureFlag.findUnique({
      where: { name: featureName },
    });

    if (!featureFlag) throw new Error(`Feature flag ${featureName} not found`);

    await this.db.featureFlagOrgWhitelist.upsert({
      where: {
        featureFlagId_organizationId: {
          featureFlagId: featureFlag.id,
          organizationId,
        },
      },
      update: {},
      create: {
        featureFlagId: featureFlag.id,
        organizationId,
      },
    });
  }

  /**
   * Blacklist an organization for a feature
   */
  async blacklistOrganization(featureName: string, organizationId: string): Promise<void> {
    this.throwIfNotSudo();
    const featureFlag = await this.db.featureFlag.findUnique({
      where: { name: featureName },
    });

    if (!featureFlag) throw new Error(`Feature flag ${featureName} not found`);

    await this.db.featureFlagOrgBlacklist.upsert({
      where: {
        featureFlagId_organizationId: {
          featureFlagId: featureFlag.id,
          organizationId,
        },
      },
      update: {},
      create: {
        featureFlagId: featureFlag.id,
        organizationId,
      },
    });
  }

  /**
   * Remove an organization from whitelist
   */
  async removeFromWhitelist(featureName: string, organizationId: string): Promise<void> {
    this.throwIfNotSudo();
    const featureFlag = await this.db.featureFlag.findUnique({
      where: { name: featureName },
    });

    if (!featureFlag) return;

    await this.db.featureFlagOrgWhitelist
      .delete({
        where: {
          featureFlagId_organizationId: {
            featureFlagId: featureFlag.id,
            organizationId,
          },
        },
      })
      .catch(() => {
        // Ignore if not found
      });
  }

  /**
   * Remove an organization from blacklist
   */
  async removeFromBlacklist(featureName: string, organizationId: string): Promise<void> {
    this.throwIfNotSudo();
    const featureFlag = await this.db.featureFlag.findUnique({
      where: { name: featureName },
    });

    if (!featureFlag) return;

    await this.db.featureFlagOrgBlacklist
      .delete({
        where: {
          featureFlagId_organizationId: {
            featureFlagId: featureFlag.id,
            organizationId,
          },
        },
      })
      .catch(() => {
        // Ignore if not found
      });
  }

  /**
   * Get detailed feature flag information including whitelist and blacklist
   */
  async getFeatureFlagDetails(featureName: string) {
    this.throwIfNotSudo();

    const featureFlag = await this.db.featureFlag.findUnique({
      where: { name: featureName },
      include: {
        whitelistedOrgs: {
          include: {
            organization: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        blacklistedOrgs: {
          include: {
            organization: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!featureFlag) {
      throw new Error(`Feature flag ${featureName} not found`);
    }

    return featureFlag;
  }

  /**
   * Get all organizations for selection
   */
  async getAllOrganizations() {
    this.throwIfNotSudo();
    return this.db.organization.findMany({
      select: {
        id: true,
        name: true,
        status: true,
      },
      where: {
        status: 'ACTIVE',
      },
      orderBy: {
        name: 'asc',
      },
    });
  }
}
