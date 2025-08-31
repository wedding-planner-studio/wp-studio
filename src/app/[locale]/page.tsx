import { HydrateClient } from '@/trpc/server';
import ErrorBoundary from '@/components/ErrorBoundary';
import i18nConfig from '@/i18nConfig';
import { notFound } from 'next/navigation';
import Hero from '@/components/landing/Hero';
import Tools from '@/components/landing/ToolsSection';
import GrowYourBusiness from '@/components/landing/GrowYourBusiness';
import FeatureGridSection from '@/components/landing/FeatureGridSection';
import Navbar from '@/components/landing/Navbar';
import ProductivitySection from '@/components/landing/ProductivitySection';
import PersonalizedAssistance from '@/components/landing/PersonalizedAssistance';
import BookAMeeting from '@/components/landing/BookAMeeting';
import Footer from '@/components/landing/Footer';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function Home({ params }: PageProps) {
  const { locale } = await params;

  // Validate locale
  if (!i18nConfig.locales.includes(locale)) {
    notFound();
  }

  return (
    <ErrorBoundary>
      <HydrateClient>
        <Navbar />
        <main className="flex min-h-screen max-w-screen-xl mx-auto flex-col items-center justify-center">
          <Hero />
          <Tools />
          <ProductivitySection />
          <GrowYourBusiness />
          <FeatureGridSection />
          <PersonalizedAssistance />
          <BookAMeeting />
          <Footer />
        </main>
      </HydrateClient>
    </ErrorBoundary>
  );
}
