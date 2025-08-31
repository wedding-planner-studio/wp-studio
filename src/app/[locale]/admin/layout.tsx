'use client';
import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { api } from '@/trpc/react';

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  // Always call hooks regardless of render condition
  const { isLoaded } = useUser();
  const [isReady, setIsReady] = useState(false);
  const utils = api.useUtils();

  // Handle cache clearing manually to avoid conditional hook usage
  useEffect(() => {
    if (isLoaded) {
      setIsReady(true);
      // Clear cache when layout is first ready
      void utils.invalidate();
    }
  }, [isLoaded, utils]);

  // Render children only when ready
  return <>{isReady ? children : null}</>;
}
