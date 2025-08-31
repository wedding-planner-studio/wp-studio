'use client';
import { useUser } from '@clerk/nextjs';
import { useEffect } from 'react';

export default function AdminPage() {
  const { user, isLoaded } = useUser();

  // Only run this effect once
  useEffect(() => {
    let isMounted = true;

    // Add a slight delay to avoid race conditions with Next.js router
    if (isLoaded && isMounted) {
      setTimeout(() => {
        if (isMounted) {
          if (!user) {
            window.location.href = '/sign-in?redirect_url=/admin';
          } else {
            window.location.href = '/admin/events';
          }
        }
      }, 100);
    }

    return () => {
      isMounted = false;
    };
  }, [isLoaded, user]);

  // Show loading or nothing during check
  return null;
}
