import { GeistSans } from 'geist/font/sans';
import { type Metadata } from 'next';
import '@/styles/globals.css';
import { TRPCReactProvider } from '@/trpc/react';
import { ClerkProvider } from '@clerk/nextjs';
import { ToasterProvider } from '@/components/providers/toaster-provider';
import { Suspense } from 'react';
import { dir } from 'i18next';
import i18nConfig from '@/i18nConfig';
import TranslationsProvider from '../i18n/client/TranslationsProvider'; // Client-side provider
import { useTranslation as getTranslationsForServer } from '../i18n';
import ErrorBoundary from '@/components/ErrorBoundary';
import BfcacheHandler from '@/components/BfcacheHandler';
import { notFound } from 'next/navigation';

export const metadata: Metadata = {
  title: 'WP Studio',
  description: 'All-in-one wedding planning with smart messaging and automated guest replies.',
  icons: [{ rel: 'icon', url: '/favicon.ico' }],
  openGraph: {
    title: 'WP Studio | All-in-one wedding planning',
    url: 'https://wpstudio.mx',
    description:
      'Say goodbye to guest chaos. WP Studio automates WhatsApp replies and updates your CRM in real time',
    images: [
      {
        url: 'https://8eyoe3mdhc.ufs.sh/f/n8JiHxKrIpGQfS96DRkp2NDESUiufGA5Pd9vVOMBtRITqwJW',
      },
    ],
  },
};

export function generateStaticParams() {
  return i18nConfig.locales.map(locale => ({ locale }));
}

const i18nNamespaces = ['common'];

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: { locale: string };
}>) {
  const { locale } = await params;

  // Validate locale to prevent garbled pages
  if (!i18nConfig.locales.includes(locale)) {
    notFound();
  }

  const { i18n } = await getTranslationsForServer(locale, i18nNamespaces);

  return (
    <html lang={locale} dir={dir(locale)} suppressHydrationWarning>
      <body className={GeistSans.className}>
        <ErrorBoundary>
          <TranslationsProvider
            locale={locale}
            namespaces={i18nNamespaces}
            resources={i18n.services.resourceStore.data}
          >
            <ClerkProvider>
              <TRPCReactProvider>
                <ToasterProvider />
                <BfcacheHandler />
                <Suspense fallback={null}>{children}</Suspense>
              </TRPCReactProvider>
            </ClerkProvider>
          </TranslationsProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
