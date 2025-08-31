'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useClientTranslation } from '@/app/i18n/client/TranslationsProvider';
import { BOOK_A_MEETING_URL } from '@/lib/constants';

export default function Footer() {
  const { t } = useClientTranslation('common');
  return (
    <footer className="border-t border-gray-200 bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Top section: Logo and Links */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-6 mb-6">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Image
              src="/evana_logo.png"
              alt="Evana"
              width={100}
              height={28}
              className="h-5 w-auto"
            />
          </Link>

          {/* Links */}
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {/* <Link
              href="/pricing"
              className="text-sm text-gray-600 hover:text-purple-700 transition-colors duration-200"
            >
              {t('footer.nav.pricing')}
            </Link> */}
            <Link
              href="/privacy-policy"
              className="text-sm text-gray-600 hover:text-purple-700 transition-colors duration-200"
            >
              {t('footer.nav.privacyPolicy')}
            </Link>
            <Link
              href={BOOK_A_MEETING_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-600 hover:text-purple-700 transition-colors duration-200"
            >
              {t('footer.nav.getAccess')}
            </Link>
          </nav>
        </div>

        {/* Bottom Copyright - Centered and Subtle */}
        <p className="text-xs text-gray-400 text-center">{t('footer.copyright')}</p>
      </div>
    </footer>
  );
}
