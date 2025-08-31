import { api } from '@/trpc/react';

export function useFeatureFlag(featureName: string) {
  // Use the tRPC hasAccess query
  const featureFlagQuery = api.featureFlags.hasAccess.useQuery(
    { featureName },
    {
      enabled: !!featureName,
    }
  );

  return {
    hasAccess: featureFlagQuery.data ?? false,
    isLoading: featureFlagQuery.isLoading,
  };
}
