import {
  OrganizationFeatureConfig,
  FeatureName,
  LimitName,
  OrganizationFeature,
} from '@/lib/types/features';

/**
 * Check if a feature is enabled for an organization
 */
export function hasFeature(config: OrganizationFeatureConfig, featureName: FeatureName): boolean {
  const feature = config.features.find(f => f.featureName === featureName);
  return feature?.isEnabled ?? false;
}

/**
 * Get feature configuration for a specific feature
 */
export function getFeatureConfig(
  config: OrganizationFeatureConfig,
  featureName: FeatureName
): Record<string, any> | undefined {
  const feature = config.features.find(f => f.featureName === featureName);
  return feature?.configuration;
}

/**
 * Get limit value for a specific limit type
 */
export function getLimit(config: OrganizationFeatureConfig, limitName: LimitName): number {
  const limit = config.limits.find(l => l.limitName === limitName);
  return limit?.value ?? 0;
}

/**
 * Get current usage for a specific limit type
 */
export function getCurrentUsage(config: OrganizationFeatureConfig, limitName: LimitName): number {
  const usage = config.usage.find(u => u.limitName === limitName);
  return usage?.currentValue ?? 0;
}

/**
 * Check if usage is within limits
 */
export function isWithinLimit(config: OrganizationFeatureConfig, limitName: LimitName): boolean {
  const limit = getLimit(config, limitName);
  const usage = getCurrentUsage(config, limitName);
  return usage < limit;
}

/**
 * Get remaining capacity for a limit
 */
export function getRemainingCapacity(
  config: OrganizationFeatureConfig,
  limitName: LimitName
): number {
  const limit = getLimit(config, limitName);
  const usage = getCurrentUsage(config, limitName);
  return Math.max(0, limit - usage);
}

/**
 * Get usage percentage for a limit
 */
export function getUsagePercentage(
  config: OrganizationFeatureConfig,
  limitName: LimitName
): number {
  const limit = getLimit(config, limitName);
  const usage = getCurrentUsage(config, limitName);

  if (limit === 0) return 0;
  return Math.min(100, (usage / limit) * 100);
}

/**
 * Group features by category for display
 */
export function groupFeaturesByCategory(features: OrganizationFeature[]) {
  return features.reduce(
    (acc, feature) => {
      const category = feature.featureName;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(feature);
      return acc;
    },
    {} as Record<string, OrganizationFeature[]>
  );
}

/**
 * Format usage display with units
 */
export function formatUsageDisplay(
  config: OrganizationFeatureConfig,
  limitName: LimitName
): string {
  const usage = getCurrentUsage(config, limitName);
  const limit = getLimit(config, limitName);
  const limitType = config.limits.find(l => l.limitName === limitName)?.limitName;
  let unit = '';

  switch (limitType) {
    case LimitName.ActiveEvents:
      unit = 'event';
      break;
    case LimitName.WhatsappMsgs:
      unit = 'message';
      break;
    default:
      unit = '';
      break;
  }

  return `${usage}/${limit} ${unit}`;
}

/**
 * Check if organization can perform an action based on limits
 */
export function canPerformAction(
  config: OrganizationFeatureConfig,
  limitName: LimitName,
  requestedAmount = 1 // e.g. 1 event, 100 messages, etc.
): { allowed: boolean; reason?: string } {
  const remaining = getRemainingCapacity(config, limitName);

  if (remaining < requestedAmount) {
    return {
      allowed: false,
      reason: `Insufficient capacity. ${remaining} remaining, ${requestedAmount} requested.`,
    };
  }

  return { allowed: true };
}
