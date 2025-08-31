import { useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { api } from '@/trpc/react';

export const useClearQueryCacheOnUserChange = () => {
  const { user } = useUser();
  const previousUserId = useRef<string | null>(null);
  const utils = api.useUtils();

  useEffect(() => {
    if (!user || !user?.id || user.id !== previousUserId.current) {
      previousUserId.current = user?.id ?? null;
      void utils.invalidate(); // Clears tRPC cache
    }
  }, [user?.id, utils]);
};
