'use client';

import { useEffect } from 'react';

export default function BfcacheHandler() {
  useEffect(() => {
    // Handle Safari's back-forward cache (bfcache) issues
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        // Page was restored from bfcache
        console.warn('Page restored from bfcache - forcing reload to prevent hydration issues');
        window.location.reload();
      }
    };

    // Handle potential hydration mismatches on navigation
    const handlePopState = () => {
      // Small delay to allow React to process the navigation
      setTimeout(() => {
        // Check if we're seeing serialized React data instead of HTML
        const bodyText = document.body.textContent || '';
        if (
          bodyText.includes('$Sreact') ||
          bodyText.includes('$@') ||
          bodyText.includes('%5Blocale%5D')
        ) {
          console.warn('Detected potential serialized React data - reloading page');
          window.location.reload();
        }
      }, 100);
    };

    // Add event listeners
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('popstate', handlePopState);

    // Cleanup
    return () => {
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  return null;
}
