'use client';

import { useState } from 'react';
import { api } from '@/trpc/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'react-hot-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  FiFlag,
  FiGlobe,
  FiUsers,
  FiShield,
  FiPlus,
  FiMinus,
  FiLoader,
  FiSettings,
  FiCheck,
  FiX,
  FiEye,
  FiEdit3,
  FiTrash2,
  FiClock,
  FiActivity,
} from 'react-icons/fi';

interface SelectedFeatureFlag {
  name: string;
  description?: string;
  isGloballyEnabled: boolean;
  whitelistedOrgs: Array<{
    id: string;
    organization: {
      id: string;
      name: string;
    };
    createdAt: Date;
  }>;
  blacklistedOrgs: Array<{
    id: string;
    organization: {
      id: string;
      name: string;
    };
    createdAt: Date;
  }>;
}

export default function FeatureFlagsPage() {
  const [selectedFeatureFlagName, setSelectedFeatureFlagName] = useState<string>('');
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
  const [selectedOrgForWhitelist, setSelectedOrgForWhitelist] = useState<string>('');
  const [selectedOrgForBlacklist, setSelectedOrgForBlacklist] = useState<string>('');
  const [togglingGlobal, setTogglingGlobal] = useState(false);

  const utils = api.useUtils();

  // Queries
  const { data: featureFlags, isLoading: featureFlagsLoading } = api.featureFlags.list.useQuery();
  const { data: organizations, isLoading: organizationsLoading } =
    api.featureFlags.getAllOrganizations.useQuery();
  const { data: selectedFeatureFlag, isLoading: featureFlagDetailsLoading } =
    api.featureFlags.getDetails.useQuery(
      { featureName: selectedFeatureFlagName },
      { enabled: !!selectedFeatureFlagName }
    );

  // Mutations
  const toggleGloballyMutation = api.featureFlags.toggleGlobally.useMutation({
    onSuccess: () => {
      toast.success('Feature flag global setting updated successfully');
      void utils.featureFlags.list.invalidate();
      void utils.featureFlags.getDetails.invalidate();
    },
    onError: error => {
      toast.error(error.message || 'Failed to update global setting');
    },
  });

  const toggleWhitelistMutation = api.featureFlags.toggleOrganizationOnWhitelist.useMutation({
    onSuccess: () => {
      toast.success('Organization whitelist updated successfully');
      void utils.featureFlags.getDetails.invalidate();
      setSelectedOrgForWhitelist('');
    },
    onError: error => {
      toast.error(error.message || 'Failed to update whitelist');
    },
  });

  const toggleBlacklistMutation = api.featureFlags.toggleOrganizationOnBlacklist.useMutation({
    onSuccess: () => {
      toast.success('Organization blacklist updated successfully');
      void utils.featureFlags.getDetails.invalidate();
      setSelectedOrgForBlacklist('');
    },
    onError: error => {
      toast.error(error.message || 'Failed to update blacklist');
    },
  });

  const handleToggleGlobally = (featureName: string, isEnabled: boolean) => {
    setTogglingGlobal(true);
    toggleGloballyMutation.mutate(
      { featureName, isEnabled },
      {
        onSettled: () => {
          setTogglingGlobal(false);
        },
      }
    );
  };

  const handleAddToWhitelist = () => {
    if (!selectedOrgForWhitelist || !selectedFeatureFlagName) return;
    toggleWhitelistMutation.mutate({
      featureName: selectedFeatureFlagName,
      organizationId: selectedOrgForWhitelist,
      isOnWhitelist: true,
    });
  };

  const handleRemoveFromWhitelist = (organizationId: string) => {
    if (!selectedFeatureFlagName) return;
    toggleWhitelistMutation.mutate({
      featureName: selectedFeatureFlagName,
      organizationId,
      isOnWhitelist: false,
    });
  };

  const handleAddToBlacklist = () => {
    if (!selectedOrgForBlacklist || !selectedFeatureFlagName) return;
    toggleBlacklistMutation.mutate({
      featureName: selectedFeatureFlagName,
      organizationId: selectedOrgForBlacklist,
      isOnBlacklist: true,
    });
  };

  const handleRemoveFromBlacklist = (organizationId: string) => {
    if (!selectedFeatureFlagName) return;
    toggleBlacklistMutation.mutate({
      featureName: selectedFeatureFlagName,
      organizationId,
      isOnBlacklist: false,
    });
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const getAvailableOrgsForWhitelist = () => {
    if (!organizations || !selectedFeatureFlag) return [];
    const whitelistedOrgIds = selectedFeatureFlag.whitelistedOrgs.map(w => w.organization.id);
    const availableOrgs = organizations.filter(org => !whitelistedOrgIds.includes(org.id));
    return availableOrgs;
  };

  const getAvailableOrgsForBlacklist = () => {
    if (!organizations || !selectedFeatureFlag) return [];
    const blacklistedOrgIds = selectedFeatureFlag.blacklistedOrgs.map(b => b.organization.id);
    const availableOrgs = organizations.filter(org => !blacklistedOrgIds.includes(org.id));
    return availableOrgs;
  };

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Feature Flags Management</h1>
              <p className="text-gray-600 mt-1">
                Manage global feature flags and organization-specific access controls
              </p>
            </div>
          </div>

          {/* Feature Flags Overview */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FiFlag className="h-5 w-5 text-gray-600" />
                  <div>
                    <h3 className="font-medium text-gray-900">Feature Flags</h3>
                    <p className="text-sm text-gray-600">
                      Global feature flags and their current status
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    {featureFlags?.filter(f => f.isGloballyEnabled).length || 0} of{' '}
                    {featureFlags?.length || 0} globally enabled
                  </span>
                </div>
              </div>
            </div>

            {featureFlagsLoading ? (
              <div className="p-6">
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="animate-pulse">
                      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
                          <div>
                            <div className="h-4 w-32 bg-gray-200 rounded mb-1"></div>
                            <div className="h-3 w-48 bg-gray-100 rounded"></div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="h-6 w-16 bg-gray-200 rounded"></div>
                          <div className="h-8 w-20 bg-gray-200 rounded"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                {featureFlags?.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="p-4 bg-gray-100 rounded-full w-fit mx-auto mb-4">
                      <FiFlag className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Feature Flags</h3>
                    <p className="text-gray-600">No feature flags have been created yet.</p>
                  </div>
                ) : (
                  <div>
                    {featureFlags?.map(flag => (
                      <div
                        key={flag.id}
                        className="flex items-center justify-between p-4 text-sm hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <FiFlag className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-gray-900">{flag.name}</h4>
                              <div
                                className={`w-2 h-2 rounded-full ${
                                  flag.isGloballyEnabled
                                    ? 'bg-gradient-to-r from-emerald-500 to-green-500'
                                    : 'bg-gray-300'
                                }`}
                              ></div>
                            </div>
                            <p className="text-xs text-gray-600">
                              {flag.description || 'No description provided'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge
                            variant={flag.isGloballyEnabled ? 'default' : 'secondary'}
                            className={
                              flag.isGloballyEnabled
                                ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white'
                                : ''
                            }
                          >
                            {flag.isGloballyEnabled ? 'Globally Enabled' : 'Disabled'}
                          </Badge>
                          <div className="flex items-center gap-2">
                            {togglingGlobal && selectedFeatureFlagName === flag.name && (
                              <FiLoader className="h-4 w-4 text-gray-400 animate-spin" />
                            )}
                            <Switch
                              checked={flag.isGloballyEnabled}
                              onCheckedChange={checked => handleToggleGlobally(flag.name, checked)}
                              disabled={togglingGlobal && selectedFeatureFlagName === flag.name}
                            />
                          </div>
                          <Dialog
                            open={isManageDialogOpen && selectedFeatureFlagName === flag.name}
                            onOpenChange={open => {
                              setIsManageDialogOpen(open);
                              if (open) {
                                setSelectedFeatureFlagName(flag.name);
                              } else {
                                setSelectedFeatureFlagName('');
                              }
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs"
                                onClick={() => {
                                  setSelectedFeatureFlagName(flag.name);
                                  setIsManageDialogOpen(true);
                                }}
                              >
                                <FiSettings className="h-4 w-4 mr-1" />
                                Manage
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[80vh] overflow-visible">
                              <div className="max-h-[70vh] overflow-y-auto pr-2">
                                <DialogHeader>
                                  <DialogTitle className="flex items-center gap-2">
                                    <FiFlag className="h-5 w-5" />
                                    Manage Feature Flag: {flag.name}
                                  </DialogTitle>
                                  <DialogDescription>
                                    Configure organization-specific access controls for this feature
                                    flag.
                                  </DialogDescription>
                                </DialogHeader>

                                {featureFlagDetailsLoading ? (
                                  <div className="space-y-6 py-4">
                                    <div className="animate-pulse">
                                      <div className="h-4 w-32 bg-gray-200 rounded mb-4"></div>
                                      <div className="space-y-2">
                                        <div className="h-3 w-full bg-gray-200 rounded"></div>
                                        <div className="h-3 w-3/4 bg-gray-200 rounded"></div>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  selectedFeatureFlag && (
                                    <div className="space-y-6 py-4">
                                      {/* Global Status */}
                                      <div className="p-4 bg-gray-50 rounded-lg">
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-3">
                                            <FiGlobe className="h-5 w-5 text-gray-600" />
                                            <div>
                                              <h4 className="font-medium text-gray-900">
                                                Global Status
                                              </h4>
                                              <p className="text-sm text-gray-600">
                                                When globally enabled, all organizations have access
                                                unless blacklisted
                                              </p>
                                            </div>
                                          </div>
                                          <Badge
                                            variant={
                                              selectedFeatureFlag.isGloballyEnabled
                                                ? 'default'
                                                : 'secondary'
                                            }
                                            className={
                                              selectedFeatureFlag.isGloballyEnabled
                                                ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white'
                                                : ''
                                            }
                                          >
                                            {selectedFeatureFlag.isGloballyEnabled
                                              ? 'Globally Enabled'
                                              : 'Disabled'}
                                          </Badge>
                                        </div>
                                      </div>

                                      {/* Whitelist Management */}
                                      <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-3">
                                            <FiUsers className="h-5 w-5 text-green-600" />
                                            <div>
                                              <h4 className="font-medium text-gray-900">
                                                Whitelisted Organizations
                                              </h4>
                                              <p className="text-sm text-gray-600">
                                                Organizations with explicit access when feature is
                                                not globally enabled
                                              </p>
                                            </div>
                                          </div>
                                          <Badge variant="outline">
                                            {selectedFeatureFlag.whitelistedOrgs.length}{' '}
                                            organizations
                                          </Badge>
                                        </div>

                                        {/* Add to Whitelist */}
                                        <div className="flex gap-2">
                                          <Select
                                            value={selectedOrgForWhitelist}
                                            onValueChange={setSelectedOrgForWhitelist}
                                          >
                                            <SelectTrigger className="flex-1">
                                              <SelectValue placeholder="Select organization to whitelist..." />
                                            </SelectTrigger>
                                            <SelectContent
                                              style={{ zIndex: 9999 }}
                                              className="z-[9999]"
                                            >
                                              {(() => {
                                                const availableOrgs =
                                                  getAvailableOrgsForWhitelist();
                                                if (availableOrgs.length === 0) {
                                                  return (
                                                    <SelectItem value="no-orgs" disabled>
                                                      No organizations available
                                                    </SelectItem>
                                                  );
                                                }

                                                return availableOrgs.map(org => {
                                                  return (
                                                    <SelectItem key={org.id} value={org.id}>
                                                      {org.name}
                                                    </SelectItem>
                                                  );
                                                });
                                              })()}
                                            </SelectContent>
                                          </Select>
                                          <Button
                                            onClick={handleAddToWhitelist}
                                            disabled={
                                              !selectedOrgForWhitelist ||
                                              toggleWhitelistMutation.isPending
                                            }
                                            size="sm"
                                          >
                                            <FiPlus className="h-4 w-4 mr-1" />
                                            Add
                                          </Button>
                                        </div>

                                        {/* Whitelist Items */}
                                        <div className="space-y-2 max-h-40 overflow-y-auto">
                                          {selectedFeatureFlag.whitelistedOrgs.length === 0 ? (
                                            <p className="text-sm text-gray-500 italic py-2">
                                              No organizations whitelisted
                                            </p>
                                          ) : (
                                            selectedFeatureFlag.whitelistedOrgs.map(item => (
                                              <div
                                                key={item.id}
                                                className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
                                              >
                                                <div className="flex items-center gap-3">
                                                  <FiCheck className="h-4 w-4 text-green-600" />
                                                  <div>
                                                    <span className="font-medium text-gray-900">
                                                      {item.organization.name}
                                                    </span>
                                                    <div className="flex items-center gap-1 text-xs text-gray-500">
                                                      <FiClock className="h-3 w-3" />
                                                      Added {formatDate(item.createdAt)}
                                                    </div>
                                                  </div>
                                                </div>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() =>
                                                    handleRemoveFromWhitelist(item.organization.id)
                                                  }
                                                  disabled={toggleWhitelistMutation.isPending}
                                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                >
                                                  <FiMinus className="h-4 w-4" />
                                                </Button>
                                              </div>
                                            ))
                                          )}
                                        </div>
                                      </div>

                                      {/* Blacklist Management */}
                                      <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-3">
                                            <FiShield className="h-5 w-5 text-red-600" />
                                            <div>
                                              <h4 className="font-medium text-gray-900">
                                                Blacklisted Organizations
                                              </h4>
                                              <p className="text-sm text-gray-600">
                                                Organizations explicitly denied access (takes
                                                precedence over global and whitelist)
                                              </p>
                                            </div>
                                          </div>
                                          <Badge variant="outline">
                                            {selectedFeatureFlag.blacklistedOrgs.length}{' '}
                                            organizations
                                          </Badge>
                                        </div>

                                        {/* Add to Blacklist */}
                                        <div className="flex gap-2">
                                          <Select
                                            value={selectedOrgForBlacklist}
                                            onValueChange={setSelectedOrgForBlacklist}
                                          >
                                            <SelectTrigger className="flex-1">
                                              <SelectValue placeholder="Select organization to blacklist..." />
                                            </SelectTrigger>
                                            <SelectContent
                                              style={{ zIndex: 9999 }}
                                              className="z-[9999]"
                                            >
                                              {(() => {
                                                const availableOrgs =
                                                  getAvailableOrgsForBlacklist();

                                                if (availableOrgs.length === 0) {
                                                  return (
                                                    <SelectItem value="no-orgs" disabled>
                                                      No organizations available
                                                    </SelectItem>
                                                  );
                                                }

                                                return availableOrgs.map(org => {
                                                  return (
                                                    <SelectItem key={org.id} value={org.id}>
                                                      {org.name}
                                                    </SelectItem>
                                                  );
                                                });
                                              })()}
                                            </SelectContent>
                                          </Select>
                                          <Button
                                            onClick={handleAddToBlacklist}
                                            disabled={
                                              !selectedOrgForBlacklist ||
                                              toggleBlacklistMutation.isPending
                                            }
                                            size="sm"
                                            variant="destructive"
                                          >
                                            <FiPlus className="h-4 w-4 mr-1" />
                                            Add
                                          </Button>
                                        </div>

                                        {/* Blacklist Items */}
                                        <div className="space-y-2 max-h-40 overflow-y-auto">
                                          {selectedFeatureFlag.blacklistedOrgs.length === 0 ? (
                                            <p className="text-sm text-gray-500 italic py-2">
                                              No organizations blacklisted
                                            </p>
                                          ) : (
                                            selectedFeatureFlag.blacklistedOrgs.map(item => (
                                              <div
                                                key={item.id}
                                                className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg"
                                              >
                                                <div className="flex items-center gap-3">
                                                  <FiX className="h-4 w-4 text-red-600" />
                                                  <div>
                                                    <span className="font-medium text-gray-900">
                                                      {item.organization.name}
                                                    </span>
                                                    <div className="flex items-center gap-1 text-xs text-gray-500">
                                                      <FiClock className="h-3 w-3" />
                                                      Added {formatDate(item.createdAt)}
                                                    </div>
                                                  </div>
                                                </div>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() =>
                                                    handleRemoveFromBlacklist(item.organization.id)
                                                  }
                                                  disabled={toggleBlacklistMutation.isPending}
                                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                >
                                                  <FiMinus className="h-4 w-4" />
                                                </Button>
                                              </div>
                                            ))
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <FiFlag className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {featureFlags?.length || 0}
                  </h3>
                  <p className="text-sm text-gray-600">Total Feature Flags</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-lg">
                  <FiActivity className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {featureFlags?.filter(f => f.isGloballyEnabled).length || 0}
                  </h3>
                  <p className="text-sm text-gray-600">Globally Enabled</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <FiUsers className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {organizations?.length || 0}
                  </h3>
                  <p className="text-sm text-gray-600">Total Organizations</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
