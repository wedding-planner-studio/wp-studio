'use client';

import React from 'react';
import { useRoleBasedPermission, RoleBasedPermission } from '@/hooks/useRoleBasedPermission';
import { useOrganizationFeature } from '@/hooks/useOrganizationFeatures';
import type { FeatureName } from '@/lib/types/features';
import type { Section, Action } from '@/lib/permissions';

interface PermissionConfig {
  // Role-based permission
  resource?: Section;
  action?: Action;

  // Organization feature (those enabled for each the organization)
  feature?: FeatureName;

  // Custom permission check function
  customCheck?: () => boolean;

  // What to render when permission is denied
  fallback?: React.ReactNode;
}

/**
 * HOC that wraps a component with permission checks
 *
 * @example
 * // Role-based permission only
 * const ProtectedUsage = withPermission(Usage, {
 *   resource: 'orgMsgUsage',
 *   action: 'read'
 * });
 *
 * @example
 * // Organization feature only
 * const ProtectedConfirmations = withPermission(ConfirmationSection, {
 *   feature: 'additionalGuestConfirmations'
 * });
 *
 * @example
 * // Both role and feature required
 * const ProtectedComponent = withPermission(MyComponent, {
 *   resource: 'bulkMessages',
 *   action: 'create',
 *   feature: 'bulkMessages'
 * });
 *
 * @example
 * // Either role OR feature required
 * const FlexibleComponent = withPermission(MyComponent, {
 *   resource: 'events',
 *   action: 'update',
 *   feature: 'additionalGuestConfirmations',
 * });
 */
export function withPermission<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  config: PermissionConfig
) {
  const PermissionWrapper = (props: P) => {
    const { resource, action, feature, customCheck, fallback } = config;

    // Get role-based permission if specified
    const rolePermission = useRoleBasedPermission(resource, action ?? 'view');

    // Get organization feature if specified (only call if feature is provided)
    const orgFeature = useOrganizationFeature(feature);

    // Calculate permissions
    const hasRolePermission = resource && action ? rolePermission.hasPermission : true;
    const hasFeatureAccess = feature ? orgFeature.hasAccess : true;
    const hasCustomPermission = customCheck ? customCheck() : true;

    // Determine if user has access: ALL permissions must be true
    const hasAccess = hasRolePermission && hasFeatureAccess && hasCustomPermission;

    // Show loading state if any permission check is loading
    const isLoading = feature && orgFeature.isLoading;

    if (isLoading) {
      return <div className="animate-pulse bg-gray-100 rounded h-4 w-full" />;
    }

    if (!hasAccess) {
      if (fallback) {
        return <>{fallback}</>;
      }
      return null;
    }

    return <WrappedComponent {...props} />;
  };

  // Set display name for debugging
  PermissionWrapper.displayName = `withPermission(${WrappedComponent.displayName || WrappedComponent.name})`;

  return PermissionWrapper;
}

/**
 * Convenience HOC for role-based permissions only
 */
export function withRolePermission<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  resource: Section,
  action: Action,
  fallback?: React.ReactNode
) {
  return withPermission(WrappedComponent, {
    resource,
    action,
    fallback,
  });
}

/**
 * Convenience HOC for organization features only
 */
export function withFeature<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  feature: FeatureName,
  fallback?: React.ReactNode
) {
  return withPermission(WrappedComponent, {
    feature,
    fallback,
  });
}
