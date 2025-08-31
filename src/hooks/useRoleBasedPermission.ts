import { useAuth } from '@clerk/nextjs'; // or your session context
import { api } from '@/trpc/react';
import { permissions, Permission, Action } from '@/lib/permissions';
import { UserRole } from '@prisma/client';

export interface RoleBasedPermission {
  hasPermission: boolean;
  hasAccessToSection: boolean;
  role?: UserRole;
  isFetched: boolean;
}

export const useRoleBasedPermission = (
  permission: Permission | undefined,
  action: Action
): RoleBasedPermission => {
  const { userId } = useAuth();

  if (!permission) return { hasPermission: false, hasAccessToSection: false, isFetched: false };

  // Query user's role (you could also use context if already available)
  const {
    data: user,
    isFetched,
    isLoading,
  } = api.user.get.useQuery(undefined, {
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading || !user)
    return { hasPermission: false, hasAccessToSection: false, role: user?.role, isFetched };

  return {
    hasPermission: permissions[user.role]?.[permission]?.actions.includes(action) ?? false,
    hasAccessToSection: permissions[user.role]?.[permission]?.hasAccessToSection ?? false,
    role: user.role,
    isFetched,
  };
};
