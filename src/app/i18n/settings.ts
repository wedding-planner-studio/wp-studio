import i18nConfig from '../../../i18nConfig'; // Path from src/app/i18n/settings.ts to root

export const fallbackLng = i18nConfig.defaultLocale;
export const languages = i18nConfig.locales;
export const defaultNS = 'common'; // Default namespace if not specified

export function getOptions(lng: string = fallbackLng, nsInput: string | string[] = defaultNS) {
  const resolvedNs = Array.isArray(nsInput) ? nsInput[0] : nsInput;
  return {
    // debug: process.env.NODE_ENV === 'development',
    supportedLngs: languages,
    fallbackLng,
    lng,
    fallbackNS: resolvedNs, // Use the first namespace if an array is provided
    defaultNS: resolvedNs, // Use the first namespace if an array is provided
    ns: nsInput, // i18next init `ns` can be string or array
    interpolation: {
      escapeValue: false, // Not needed for React
      formatSeparator: ',',
      format: (value, format) => {
        if (format === 'uppercase') return value.toUpperCase();
        return value;
      },
    },
    // preload: languages, // Preload all languages
    // backend: { // If using i18next-http-backend
    //   loadPath: '/locales/{{lng}}/{{ns}}.json',
    // },
  };
}
