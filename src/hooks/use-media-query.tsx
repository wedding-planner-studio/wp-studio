'use client';

import { useEffect, useState } from 'react';

function getDevice(): 'mobile' | 'tablet' | 'desktop' | null {
  if (typeof window === 'undefined') return null;

  return window.matchMedia('(min-width: 1024px)').matches
    ? 'desktop'
    : window.matchMedia('(min-width: 640px)').matches
      ? 'tablet'
      : 'mobile';
}

function getDimensions() {
  if (typeof window === 'undefined') return null;

  return { width: window.innerWidth, height: window.innerHeight };
}

export function useMediaQuery(query?: string) {
  const [matches, setMatches] = useState<boolean>(false);
  const [device, setDevice] = useState<'mobile' | 'tablet' | 'desktop' | null>(getDevice());
  const [dimensions, setDimensions] = useState<{
    width: number;
    height: number;
  } | null>(getDimensions());

  useEffect(() => {
    const checkDevice = () => {
      setDevice(getDevice());
      setDimensions(getDimensions());
    };

    // Initial detection
    checkDevice();

    // Listener for windows resize
    window.addEventListener('resize', checkDevice);

    // Cleanup listener
    return () => {
      window.removeEventListener('resize', checkDevice);
    };
  }, []);

  useEffect(() => {
    const mediaQueryList = window.matchMedia(String(query));

    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Initial check
    setMatches(mediaQueryList.matches);

    // Add listener for changes
    mediaQueryList.addEventListener('change', handleChange);

    // Clean up listener on unmount
    return () => {
      mediaQueryList.removeEventListener('change', handleChange);
    };
  }, [query]);

  return {
    device,
    width: dimensions?.width,
    height: dimensions?.height,
    isMobile: device === 'mobile',
    isTablet: device === 'tablet',
    isDesktop: device === 'desktop',
    matches,
  };
}
