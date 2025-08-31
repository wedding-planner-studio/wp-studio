'use client';

import { ReactNode, useEffect, useState, useMemo } from 'react';
import { I18nextProvider, useTranslation as useReactI18NextTranslation } from 'react-i18next';
import { createInstance, i18n as I18nInstanceType, InitOptions } from 'i18next';
import resourcesToBackend from 'i18next-resources-to-backend';
import { initReactI18next } from 'react-i18next/initReactI18next';
import { getOptions } from '../settings'; // Path from src/app/i18n/client/ to src/app/i18n/
import { LoadingDots } from '@/components/ui';

const initI18nextClient = async (
  lng: string,
  ns: string | string[],
  instance?: I18nInstanceType,
  initialResources?: any
) => {
  const i18nInstance = instance || createInstance();
  i18nInstance
    .use(initReactI18next) // For using react-i18next features like the useTranslation hook
    .use(
      resourcesToBackend(
        (language: string, namespace: string) =>
          import(`../../../../public/locales/${language}/${namespace}.json`)
      )
    );

  // Start with base options
  const options: InitOptions = getOptions(lng, ns);
  // Add initial resources if they exist
  if (initialResources) {
    options.resources = initialResources;
  }

  await i18nInstance.init(options);
  return i18nInstance;
};

interface TranslationsProviderProps {
  children: ReactNode;
  locale: string;
  namespaces: string[];
  resources?: any; // Pre-loaded resources from the server
}

export default function TranslationsProvider({
  children,
  locale,
  namespaces,
  resources, // These are the initial resources from the server
}: TranslationsProviderProps) {
  // Memoize resources to prevent re-renders if the object reference changes but content is same
  const memoizedResources = useMemo(() => resources, [resources]);

  const [i18n, setI18n] = useState<I18nInstanceType | null>(null);

  useEffect(() => {
    let active = true; // Prevent state updates on unmounted component
    const instance = createInstance();

    initI18nextClient(locale, namespaces, instance, memoizedResources)
      .then(initializedInstance => {
        if (active) {
          setI18n(initializedInstance);
        }
      })
      .catch(console.error); // Basic error handling

    return () => {
      active = false;
    };
    // Effect should re-run if locale, namespaces, or memoizedResources change
    // Adding i18n to dependency array can cause loops if not handled carefully, so omitted here.
    // The goal is to re-init if props defining the i18n setup change.
  }, [locale, namespaces, memoizedResources]);

  // Effect to change language if locale prop changes after instance is initialized
  useEffect(() => {
    if (i18n && i18n.language !== locale) {
      i18n.changeLanguage(locale);
    }
  }, [locale, i18n]);

  if (!i18n || !i18n.isInitialized) {
    // Render a loading state while i18n is initializing asynchronously.
    // This prevents children from attempting to use translations before the context is ready.
    // You can replace this with a more sophisticated loading component (e.g., a spinner or skeleton)
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          fontFamily: 'sans-serif',
          color: '#555',
        }}
      >
        <LoadingDots />
      </div>
    );
  }

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}

// Re-export useTranslation from react-i18next for client components for convenience
// Renaming to avoid confusion with server-side useTranslation
export const useClientTranslation = useReactI18NextTranslation;
