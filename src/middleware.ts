import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { i18nRouter } from 'next-i18n-router';
import i18nConfig from '@/i18nConfig';

// include locale-prefixed paths
// Assumes 'en' is defaultLocale and not prefixed, 'es' is another locale and is prefixed.
const isPublicRoute = createRouteMatcher([
  // Default locale (e.g., 'en') paths
  '/sign-in(.*)',
  '/',
  '/pricing',
  '/privacy-policy',
  '/terms-of-service',

  // Other locale (e.g., 'es') paths
  '/es/sign-in(.*)',
  '/es', // For /es/
  '/es/pricing',
  '/es/privacy-policy',
  '/es/terms-of-service',

  // Original API public routes (no locale prefix)
  '/api/upstash(.*)',
  '/api/uploadthing(.*)',
  '/api/cdn(.*)',
  '/api/twilio(.*)',
  '/api/trpc/user.joinWaitlist(.*)',

  // Clerk webhook
  '/api/clerk(.*)',
]);

export default clerkMiddleware(async (auth, request) => {
  const pathname = request.nextUrl.pathname;

  // Check if it's an API path (these should not be processed by i18nRouter)
  const isApiPath = pathname.startsWith('/api/') || pathname.startsWith('/trpc/');

  // Skip Next.js internal paths
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon.ico')) {
    return NextResponse.next();
  }

  if (!isApiPath) {
    // Validate locale in URL to prevent garbled pages
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length > 0) {
      const potentialLocale = segments[0];
      // If first segment looks like a locale but isn't valid, redirect to default
      if (
        potentialLocale &&
        potentialLocale.length === 2 &&
        !i18nConfig.locales.includes(potentialLocale)
      ) {
        const correctedPath = pathname.replace(
          `/${potentialLocale}`,
          `/${i18nConfig.defaultLocale}`
        );
        return NextResponse.redirect(new URL(correctedPath, request.url));
      }
    }

    // Run i18n router for non-API paths
    try {
      const i18nResponse = i18nRouter(request, i18nConfig);
      if (i18nResponse) {
        // i18nRouter has decided to redirect
        return i18nResponse;
      }
    } catch (error) {
      console.error('i18n router error:', error);
      // Fallback to default locale on i18n error
      return NextResponse.redirect(new URL(`/${i18nConfig.defaultLocale}${pathname}`, request.url));
    }
  }

  const { userId, redirectToSignIn } = await auth();

  if (isPublicRoute(request)) {
    return NextResponse.next();
  }

  if (!userId) {
    return redirectToSignIn();
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
