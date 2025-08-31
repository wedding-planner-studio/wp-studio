import { createInstance, i18n as I18NextClient } from 'i18next';
import resourcesToBackend from 'i18next-resources-to-backend';
import { initReactI18next } from 'react-i18next/initReactI18next';
import { getOptions } from './settings';
// import {languages} from './settings'; // If you need direct access to languages here

const initI18next = async (lng: string, ns: string | string[]) => {
  const i18nInstance = createInstance();
  await i18nInstance
    .use(initReactI18next) // Binds react-i18next to the instance
    .use(
      resourcesToBackend(
        (language: string, namespace: string) =>
          import(`../../../public/locales/${language}/${namespace}.json`)
      )
    )
    .init(getOptions(lng, ns));
  return i18nInstance;
};

// This hook is for Server Components
export async function useTranslation(
  lng: string,
  ns: string | string[] = 'common',
  options: { keyPrefix?: string } = {}
) {
  const i18nextInstance = await initI18next(lng, ns);
  return {
    t: i18nextInstance.getFixedT(lng, Array.isArray(ns) ? ns[0] : ns, options.keyPrefix),
    i18n: i18nextInstance as I18NextClient, // Cast to avoid issues with server/client type discrepancies
  };
}
