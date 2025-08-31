'use client';

import { api } from '@/trpc/react';
import type { FeatureName, LimitName } from '@/lib/types/features';

/**
 * Hook to check organization features for the current user's organization
 * Similar to useFeatureFlag but for organization-based features
 */
export const useOrganizationFeatures = () => {
  const {
    data: organizationConfig,
    isLoading,
    error,
  } = api.features.getOrganizationConfig.useQuery({});

  /**
   * Check if a specific feature is enabled for the organization
   */
  const hasFeatureEnabled = (featureName?: FeatureName): boolean => {
    if (!featureName) return true; // Default to true if no feature name is provided
    if (!organizationConfig?.features) return false;
    return organizationConfig.features.some(f => f.feature.name === featureName && f.isEnabled);
  };

  /**
   * Get the limit value for a specific limit type
   */
  const getLimitValue = (limitName: LimitName): number => {
    if (!organizationConfig?.limits) return 0;
    const limit = organizationConfig.limits.find(l => l.limitType.name === limitName);
    return limit?.value ?? 0;
  };

  /**
   * Get current usage for a specific limit type (from the new comprehensive usage system)
   */
  const getUsageValue = (limitName: LimitName): number => {
    if (!organizationConfig?.usage) return 0;
    const usage = organizationConfig.usage.find(u => u.limitType.name === limitName);
    return usage?.currentValue ?? 0;
  };

  /**
   * Check if organization is within limits for a specific limit type
   */
  const isWithinLimits = (limitName: LimitName): boolean => {
    const limit = getLimitValue(limitName);
    const usage = getUsageValue(limitName);
    return usage < limit;
  };

  /**
   * Get remaining capacity for a specific limit type
   */
  const getRemainingCapacity = (limitName: LimitName): number => {
    const limit = getLimitValue(limitName);
    const usage = getUsageValue(limitName);
    return Math.max(0, limit - usage);
  };

  /**
   * Check if organization can perform an action (has feature and within limits)
   */
  const canPerformAction = (
    featureName?: FeatureName,
    limitName?: LimitName,
    requestedAmount = 1
  ): { allowed: boolean; reason?: string } => {
    // Check feature requirement
    if (featureName && !hasFeatureEnabled(featureName)) {
      return {
        allowed: false,
        reason: `Feature '${featureName}' is not enabled for this organization`,
      };
    }

    // Check limit requirement
    if (limitName) {
      const remaining = getRemainingCapacity(limitName);
      if (remaining < requestedAmount) {
        return {
          allowed: false,
          reason: `Insufficient capacity. ${remaining} remaining, ${requestedAmount} requested.`,
        };
      }
    }

    return { allowed: true };
  };

  return {
    // Data
    organizationConfig,
    isLoading,
    error,

    // Feature checks
    hasFeatureEnabled,

    // Limit checks
    getLimitValue,
    getUsageValue,
    isWithinLimits,
    getRemainingCapacity,

    // Combined checks
    canPerformAction,
  };
};

/**
 * Simple hook to check a single feature (similar to useFeatureFlag)
 * Usage: const { hasAccess } = useOrganizationFeature('additionalGuestConfirmations');
 */
export const useOrganizationFeature = (featureName?: FeatureName) => {
  const {
    hasFeatureEnabled,
    organizationConfig,
    isLoading: orgFeaturesLoading,
    error,
  } = useOrganizationFeatures();

  // Find the feature to check if it has a feature flag
  const feature = organizationConfig?.features?.find(f => f.feature.name === featureName);
  const hasFeatureFlag = feature?.feature?.featureFlag;

  // If feature has a feature flag, also check feature flag access
  const { data: featureFlagAccess, isLoading: featureFlagLoading } =
    api.featureFlags.hasAccess.useQuery(
      { featureName: hasFeatureFlag?.name || '' },
      {
        enabled: !!hasFeatureFlag?.name,
        staleTime: 5 * 60 * 1000, // Cache for 5 minutes
      }
    );

  const isLoading = orgFeaturesLoading || (hasFeatureFlag && featureFlagLoading);

  // Calculate final access:
  // 1. Organization must have the feature enabled
  // 2. If feature has a feature flag, feature flag must also allow access
  const hasAccess = hasFeatureEnabled(featureName) && (!hasFeatureFlag || featureFlagAccess);

  return {
    hasAccess,
    isLoading,
    error,
  };
};

/**
 * Hook to check organization features for a specific organization (admin use)
 */
export const useOrganizationFeaturesForOrg = (organizationId?: string) => {
  const {
    data: organizationConfig,
    isLoading,
    error,
  } = api.features.getOrganizationConfig.useQuery(
    { organizationId },
    { enabled: !!organizationId }
  );

  const hasFeatureEnabled = (featureName: FeatureName): boolean => {
    if (!organizationConfig?.features) return false;
    return organizationConfig.features.some(f => f.feature.name === featureName && f.isEnabled);
  };

  const getLimitValue = (limitName: LimitName): number => {
    if (!organizationConfig?.limits) return 0;
    const limit = organizationConfig.limits.find(l => l.limitType.name === limitName);
    return limit?.value ?? 0;
  };

  return {
    organizationConfig,
    isLoading,
    error,
    hasFeatureEnabled,
    getLimitValue,
  };
};
