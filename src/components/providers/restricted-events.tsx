'use client';

import { api } from '@/trpc/react';
import { useParams, useRouter } from 'next/navigation';
import AdminLayout from '../layouts/AdminLayout';
import { Spinner } from '@/components/ui';
import { useEffect } from 'react';
import { NotFound } from '../ui/not-found';

export const RestrictedEvents = ({ children }: { children: React.ReactNode }) => {
  const params = useParams();
  const utils = api.useUtils();
  const router = useRouter();
  const {
    data: hasAccess,
    isLoading,
    isFetched,
  } = api.user.hasAccessToEvent.useQuery(
    {
      eventId: params.id ? String(params.id) : '',
    },
    {
      enabled: !!params.id,
      retry: false,
    }
  );

  useEffect(() => {
    if (params.id && !isLoading && !hasAccess) {
      void utils.invalidate();
      router.push('/');
    }
  }, [hasAccess, isLoading, router, params.id]);

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-full">
          <Spinner className="w-8 h-8 text-purple-500" />
        </div>
      </AdminLayout>
    );
  }

  if (isFetched && !hasAccess) {
    return (
      <AdminLayout>
        <NotFound
          title="Access Denied"
          description="You don't have permission to access this event. Please contact your administrator if you believe this is a mistake."
          backButtonLabel="Go to Home"
          backButtonHref="/"
        />
      </AdminLayout>
    );
  }

  return <>{children}</>;
};
