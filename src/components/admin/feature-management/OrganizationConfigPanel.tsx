'use client';

import { useState } from 'react';
import { api } from '@/trpc/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'react-hot-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FiSettings,
  FiLayers,
  FiUsers,
  FiFlag,
  FiActivity,
  FiDatabase,
  FiCpu,
  FiHardDrive,
  FiShield,
  FiGitBranch,
  FiServer,
  FiMessageSquare,
  FiSend,
  FiHeart,
  FiUserCheck,
  FiCheckSquare,
  FiMapPin,
  FiLoader,
  FiClock,
} from 'react-icons/fi';
import {
  getAllFeatureDefinitions,
  getAllLimitDefinitions,
  type FeatureName,
  type LimitName,
} from '@/lib/types/features';

// Feature icon mapping
const FEATURE_ICONS: Record<FeatureName, React.ComponentType<{ className?: string }>> = {
  seatAssignment: FiMapPin,
  bulkMessages: FiSend,
  coupleAccount: FiHeart,
  advancedChatbot: FiMessageSquare,
  chatbotTesting: FiActivity,
  additionalGuestConfirmations: FiUserCheck,
  customWhatsapp: FiMessageSquare,
};

export default function OrganizationConfigPanel() {
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string>('');
  // Local state for limit input values to prevent immediate API calls
  const [localLimitValues, setLocalLimitValues] = useState<Record<string, string>>({});
  // Track which feature is being toggled
  const [togglingFeature, setTogglingFeature] = useState<string | null>(null);

  const utils = api.useUtils();

  // Get predefined features and limits
  const allFeatures = getAllFeatureDefinitions();
  const allLimits = getAllLimitDefinitions();

  // Queries
  const { data: dbFeatures } = api.features.getAllFeatures.useQuery();
  const { data: dbLimitTypes } = api.features.getAllLimitTypes.useQuery();
  const { data: organizations, isLoading: organizationsLoading } =
    api.features.getAllOrganizations.useQuery();
  const { data: organizationConfig, isLoading: organizationConfigLoading } =
    api.features.getOrganizationConfig.useQuery(
      { organizationId: selectedOrganizationId },
      { enabled: !!selectedOrganizationId }
    );

  // Get comprehensive usage data using the new calculation method
  const { data: comprehensiveUsage, isLoading: comprehensiveUsageLoading } =
    api.usage.getComprehensiveUsage.useQuery(
      { organizationId: selectedOrganizationId },
      { enabled: !!selectedOrganizationId }
    );

  // Create mappings from feature names to database IDs
  const getFeatureIdByName = (featureName: FeatureName): string | undefined => {
    return dbFeatures?.find(f => f.name === featureName)?.id;
  };

  const getLimitTypeIdByName = (limitName: LimitName): string | undefined => {
    return dbLimitTypes?.find(l => l.name === limitName)?.id;
  };

  // Mutations
  const toggleFeatureMutation = api.features.toggleOrganizationFeature.useMutation({
    onSuccess: () => {
      toast.success('Feature toggled successfully');
      void utils.features.getOrganizationConfig.invalidate();
    },
    onError: error => {
      toast.error(error.message || 'Failed to toggle feature');
    },
  });

  const updateLimitMutation = api.features.updateOrganizationLimit.useMutation({
    onSuccess: () => {
      toast.success('Limit updated successfully');
      void utils.features.getOrganizationConfig.invalidate();
      void utils.usage.getComprehensiveUsage.invalidate();
    },
    onError: error => {
      toast.error(error.message || 'Failed to update limit');
    },
  });

  const handleToggleOrganizationFeature = (featureName: FeatureName, isEnabled: boolean) => {
    if (!selectedOrganizationId) {
      toast.error('Please select an organization first');
      return;
    }

    const featureId = getFeatureIdByName(featureName);
    if (!featureId) {
      toast.error('Feature not found in database');
      return;
    }

    setTogglingFeature(featureName);

    toggleFeatureMutation.mutate(
      {
        organizationId: selectedOrganizationId,
        featureId,
        isEnabled,
      },
      {
        onSettled: () => {
          setTogglingFeature(null);
        },
      }
    );
  };

  const handleUpdateLimit = (limitName: LimitName, value: number) => {
    if (!selectedOrganizationId) {
      toast.error('Please select an organization first');
      return;
    }

    updateLimitMutation.mutate({
      organizationId: selectedOrganizationId,
      limitName,
      value,
    });
  };

  const getSelectedOrganizationName = () => {
    if (!selectedOrganizationId || !organizations) return null;
    const org = organizations.find(o => o.id === selectedOrganizationId);
    return org?.name;
  };

  const isFeatureEnabled = (featureName: FeatureName): boolean => {
    if (!organizationConfig?.features) return false;
    return organizationConfig.features.some(f => f.feature.name === featureName && f.isEnabled);
  };

  const getLimitValue = (limitName: LimitName): number => {
    if (!comprehensiveUsage?.limits) return 0;
    return comprehensiveUsage.limits[limitName]?.limit ?? 0;
  };

  const getUsageValue = (limitName: LimitName): number => {
    if (!comprehensiveUsage?.limits) return 0;
    return comprehensiveUsage.limits[limitName]?.usage ?? 0;
  };

  const getFeatureEnabledAt = (featureName: FeatureName): Date | null => {
    if (!organizationConfig?.features) return null;
    const feature = organizationConfig.features.find(
      f => f.feature.name === featureName && f.isEnabled
    );
    return feature?.enabledAt || null;
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return '-';
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Organization Configuration</h1>
              <p className="text-gray-600 mt-1">
                Manage feature flags and resource limits for your organizations
              </p>
            </div>
          </div>

          {/* Organization Selector */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Label htmlFor="org-select" className="text-sm font-medium text-gray-900">
                  Organization:
                </Label>
                <Select value={selectedOrganizationId} onValueChange={setSelectedOrganizationId}>
                  <SelectTrigger className="w-64" id="org-select">
                    <SelectValue placeholder="Choose organization..." />
                  </SelectTrigger>
                  <SelectContent>
                    {organizationsLoading ? (
                      <SelectItem value="loading" disabled>
                        Loading organizations...
                      </SelectItem>
                    ) : organizations?.length === 0 ? (
                      <SelectItem value="empty" disabled>
                        No organizations found
                      </SelectItem>
                    ) : (
                      organizations?.map(org => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {selectedOrganizationId && organizationConfigLoading && (
            <div className="space-y-8">
              {/* Features Table Skeleton */}
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FiLayers className="h-5 w-5 text-gray-600" />
                      <div>
                        <h3 className="font-medium text-gray-900">Organization Features</h3>
                        <p className="text-sm text-gray-600">Loading features configuration...</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full table-fixed divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/5">
                          Feature
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                          Feature Flag
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5">
                          Enabled At
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <tr key={index} className="animate-pulse">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-gray-100">
                                <div className="h-4 w-4 bg-gray-300 rounded"></div>
                              </div>
                              <div>
                                <div className="h-4 w-32 bg-gray-300 rounded mb-1"></div>
                                <div className="h-3 w-48 bg-gray-200 rounded"></div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                              <div className="h-4 w-16 bg-gray-300 rounded"></div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="h-3 w-20 bg-gray-200 rounded"></div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="h-3 w-20 bg-gray-200 rounded"></div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="h-6 w-12 bg-gray-300 rounded-full ml-auto"></div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Limits Management Skeleton */}
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FiHardDrive className="h-5 w-5 text-gray-600" />
                      <div>
                        <h3 className="font-medium text-gray-900">Resource Limits</h3>
                        <p className="text-sm text-gray-600">Loading limits configuration...</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div
                        key={index}
                        className="border border-gray-200 rounded-lg p-4 animate-pulse"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <div className="h-4 w-24 bg-gray-300 rounded mb-1"></div>
                            <div className="h-3 w-32 bg-gray-200 rounded"></div>
                          </div>
                          <div className="text-right">
                            <div className="h-3 w-12 bg-gray-200 rounded mb-1"></div>
                            <div className="h-3 w-8 bg-gray-200 rounded"></div>
                          </div>
                        </div>

                        {/* Usage Progress Bar Skeleton */}
                        <div className="mb-3">
                          <div className="flex justify-between text-xs text-gray-600 mb-1">
                            <div className="h-3 w-8 bg-gray-200 rounded"></div>
                            <div className="h-3 w-6 bg-gray-200 rounded"></div>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="h-2 bg-gray-300 rounded-full w-1/3"></div>
                          </div>
                        </div>

                        {/* Limit Input Skeleton */}
                        <div className="space-y-2">
                          <div className="h-3 w-16 bg-gray-200 rounded"></div>
                          <div className="flex gap-2">
                            <div className="h-8 flex-1 bg-gray-200 rounded"></div>
                            <div className="h-8 w-12 bg-gray-200 rounded"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedOrganizationId && organizationConfig && (
            <div className="space-y-8">
              {/* Features Table */}
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FiLayers className="h-5 w-5 text-gray-600" />
                      <div>
                        <h3 className="font-medium text-gray-900">Organization Features</h3>
                        <p className="text-sm text-gray-600">
                          Enable or disable features for this organization
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">
                        {organizationConfig.features.filter(f => f.isEnabled).length} of{' '}
                        {allFeatures.length} enabled
                      </span>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full table-fixed divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/5">
                          Feature
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                          Feature Flag
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5">
                          Enabled At
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {allFeatures.map(feature => {
                        const isEnabled = isFeatureEnabled(feature.name);
                        const FeatureIcon = FEATURE_ICONS[feature.name] || FiLayers;

                        return (
                          <tr key={feature.name} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap w-2/5">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-gray-100">
                                  <FeatureIcon className="h-4 w-4 text-gray-600" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="text-sm font-medium text-gray-900 truncate">
                                    {feature.displayName}
                                  </div>
                                  <div className="text-xs text-gray-500 truncate max-w-xs">
                                    {feature.description ?? ''}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap w-1/8">
                              <div className="flex items-center gap-2">
                                <div
                                  className={`w-2 h-2 rounded-full ${
                                    isEnabled
                                      ? 'bg-gradient-to-r from-emerald-500 to-green-500'
                                      : 'bg-gray-300'
                                  }`}
                                ></div>
                                <span
                                  className={`text-sm font-medium ${
                                    isEnabled
                                      ? 'bg-gradient-to-r from-emerald-700 to-green-700 bg-clip-text text-transparent'
                                      : 'text-gray-500'
                                  }`}
                                >
                                  {isEnabled ? 'Enabled' : 'Disabled'}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap w-1/6">
                              {(() => {
                                const dbFeature = dbFeatures?.find(f => f.name === feature.name);
                                return dbFeature?.featureFlagId ? (
                                  <div className="flex items-center gap-1">
                                    <FiGitBranch className="h-3 w-3 text-gray-400" />
                                    <span className="text-xs text-gray-600 font-mono truncate">
                                      {dbFeature.featureFlag?.name}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-400">No flag</span>
                                );
                              })()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap w-1/5">
                              {(() => {
                                const enabledAt = getFeatureEnabledAt(feature.name);
                                return enabledAt ? (
                                  <div className="flex items-center gap-2">
                                    <FiClock className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                    <div className="min-w-0 flex-1">
                                      <div className="text-xs text-gray-900 font-medium truncate">
                                        {formatDate(enabledAt)}
                                      </div>
                                      <div className="text-xs text-gray-500 truncate">
                                        {(() => {
                                          const now = new Date();
                                          const diffMs =
                                            now.getTime() - new Date(enabledAt).getTime();
                                          const diffDays = Math.floor(
                                            diffMs / (1000 * 60 * 60 * 24)
                                          );
                                          if (diffDays === 0) return 'Today';
                                          if (diffDays === 1) return '1 day ago';
                                          if (diffDays < 30) return `${diffDays} days ago`;
                                          const diffMonths = Math.floor(diffDays / 30);
                                          if (diffMonths === 1) return '1 month ago';
                                          if (diffMonths < 12) return `${diffMonths} months ago`;
                                          const diffYears = Math.floor(diffDays / 365);
                                          return diffYears === 1
                                            ? '1 year ago'
                                            : `${diffYears} years ago`;
                                        })()}
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-400">Not enabled</span>
                                );
                              })()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right w-1/8">
                              <div className="flex items-center justify-end gap-2">
                                {togglingFeature === feature.name && (
                                  <FiLoader className="h-4 w-4 text-gray-400 animate-spin" />
                                )}
                                <Switch
                                  checked={isEnabled}
                                  onCheckedChange={checked =>
                                    handleToggleOrganizationFeature(feature.name, checked)
                                  }
                                  disabled={togglingFeature === feature.name}
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Limits Management */}
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FiHardDrive className="h-5 w-5 text-gray-600" />
                      <div>
                        <h3 className="font-medium text-gray-900">Resource Limits</h3>
                        <p className="text-sm text-gray-600">
                          Configure usage limits for this organization
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {allLimits.map(limit => {
                      const currentValue = getLimitValue(limit.name);
                      const usageValue = getUsageValue(limit.name);
                      const usagePercentage =
                        currentValue > 0 ? (usageValue / currentValue) * 100 : 0;

                      return (
                        <div key={limit.name} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h4 className="text-sm font-medium text-gray-900">
                                {limit.displayName}
                              </h4>
                              <p className="text-xs text-gray-500">{limit.description}</p>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-gray-500">
                                {usageValue} / {currentValue}
                              </div>
                              <div className="text-xs text-gray-400">{limit.unit}</div>
                            </div>
                          </div>

                          {/* Usage Progress Bar */}
                          <div className="mb-3">
                            <div className="flex justify-between text-xs text-gray-600 mb-1">
                              <span>Usage</span>
                              <span>{Math.round(usagePercentage)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all duration-300 ${
                                  usagePercentage > 90
                                    ? 'bg-slate-700'
                                    : usagePercentage > 75
                                      ? 'bg-slate-500'
                                      : 'bg-slate-400'
                                }`}
                                style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* Limit Input */}
                          <div className="space-y-2">
                            <Label
                              htmlFor={`limit-${limit.name}`}
                              className="text-xs text-gray-700"
                            >
                              Limit Value
                            </Label>
                            <div className="flex gap-2">
                              <Input
                                id={`limit-${limit.name}`}
                                type="number"
                                min="0"
                                value={localLimitValues[limit.name] ?? currentValue.toString()}
                                onChange={e => {
                                  setLocalLimitValues(prev => ({
                                    ...prev,
                                    [limit.name]: e.target.value,
                                  }));
                                }}
                                className="text-sm"
                                disabled={updateLimitMutation.isPending}
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const inputValue =
                                    localLimitValues[limit.name] ?? currentValue.toString();
                                  const value = parseInt(inputValue) || 0;
                                  if (value !== currentValue) {
                                    handleUpdateLimit(limit.name, value);
                                  }
                                  // Clear local state after saving
                                  setLocalLimitValues(prev => {
                                    const newState = { ...prev };
                                    delete newState[limit.name];
                                    return newState;
                                  });
                                }}
                                disabled={updateLimitMutation.isPending}
                                className="text-xs px-2"
                              >
                                Save
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {!selectedOrganizationId && (
            <div className="bg-white rounded-lg border border-gray-200 p-12">
              <div className="text-center space-y-4">
                <div className="p-4 bg-gray-100 rounded-full w-fit mx-auto">
                  <FiSettings className="h-8 w-8 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Select an Organization</h3>
                  <p className="text-gray-600">
                    Choose an organization above to configure its features and limits
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
