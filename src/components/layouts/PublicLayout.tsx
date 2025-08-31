'use client';

import Link from 'next/link';
import { Button } from '../ui/button';
import MaxWidthWrapper from './MaxWidthWrapper';
import Image from 'next/image';
import Footer from '../Footer';
import { useClientTranslation } from '@/app/i18n/client/TranslationsProvider';

interface PublicLayoutProps {
  children: React.ReactNode;
  includeFooter?: boolean;
}

const PublicLayout = ({ children, includeFooter = false }: PublicLayoutProps) => {
  const { t } = useClientTranslation('common');

  return (
    <div className="min-h-screen w-full overflow-x-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -mb-8">
        <div
          className="absolute -left-1/2 top-10 h-[100%] aspect-square w-[100%] opacity-[0.08] blur-[100px]
          bg-[conic-gradient(from_0deg_at_center,#9333EA_0deg,#7C3AED_72deg,#6D28D9_144deg,#5B21B6_198deg,#4C1D95_261deg,#9333EA_360deg)]"
        />
      </div>
      {/* Navigation Bar */}
      <nav className="fixed top-0 w-full border-b border-gray-200 bg-white/80 backdrop-blur-sm z-50">
        <div className="container mx-auto px-4">
          <div className="flex h-14 items-center justify-between">
            {/* Logo and Main Nav */}
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center">
                <Image
                  src="/evana_logo.png"
                  alt="WP Studio"
                  width={100}
                  height={28}
                  className="h-5 w-auto -translate-x-4"
                />
              </Link>
              <div className="hidden md:flex items-center gap-6">
                {/* <Link
                  href="/pricing"
                  className="text-xs text-gray-600 hover:text-gray-900 transition-colors"
                >
                  {t('footer.nav.pricing')}
                </Link> */}
                {/* 
                <Link
                  href="#"
                  className="text-xs text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Event Overview
                </Link>
                <Link
                  href="#"
                  className="text-xs text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Guests
                </Link>
                <Link
                  href="#"
                  className="text-xs text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Event Info
                </Link>
                <Link
                  href="#"
                  className="text-xs text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Media
                </Link>
                <Link
                  href="#"
                  className="text-xs text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Communication
                </Link> */}
              </div>
            </div>

            {/* Auth Buttons */}
            <div className="flex items-center gap-6">
              <Link
                href="/admin/events"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                <Button variant="ghost">{t('waitlist.nav.login')}</Button>
              </Link>
              <Link href="/admin/events">
                <Button>{t('footer.nav.getAccess')}</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="overflow-x-hidden">
        <MaxWidthWrapper>{children}</MaxWidthWrapper>
      </div>
      {includeFooter && <Footer />}
    </div>
  );
};

export default PublicLayout;
