'use client';

import AdminLayout from '@/components/layouts/AdminLayout';
import { LoadingDots } from '@/components/ui';
import { useRoleBasedPermission } from '@/hooks/useRoleBasedPermission';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
export default function SudoPageLayout({ children }: { children: React.ReactNode }) {
  const { hasAccessToSection: hasSudoAccess, isFetched } = useRoleBasedPermission('sudo', 'read');
  const router = useRouter();

  useEffect(() => {
    if (isFetched && !hasSudoAccess) {
      router.push('/');
    }
  }, [isFetched, hasSudoAccess, router]);

  if (!isFetched) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <LoadingDots />
      </div>
    );
  }

  if (!hasSudoAccess) {
    return <div>Unauthorized</div>;
  }

  return <AdminLayout>{children}</AdminLayout>;
}
