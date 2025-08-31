'use client';

import React from 'react';
import { api } from '@/trpc/react';

export function withFeatureFlag<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  featureName: string
) {
  const PermissionWrapper = (props: P) => {
    const { data: hasAccess, isLoading } = api.featureFlags.hasAccess.useQuery({
      featureName,
    });

    if (isLoading) {
      return null; // To avoid flickering
    }

    if (!hasAccess) return null;
    return <WrappedComponent {...props} />;
  };

  PermissionWrapper.displayName = `withFeatureFlag(${WrappedComponent.displayName || WrappedComponent.name})`;

  return PermissionWrapper;
}
