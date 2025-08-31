'use client';

import { usePathname, useRouter } from 'next/navigation';
import { languages } from '@/app/i18n/settings';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useEffect, useState } from 'react';

type FlagMap = Record<string, string>;

export default function LanguageSwitcher() {
  const pathName = usePathname();
  const router = useRouter();
  const [currentLang, setCurrentLang] = useState<string>('en');

  // Handle path change when selecting a new language
  const handleLanguageChange = (newLocale: string) => {
    // Determine if the current pathname includes a locale
    const currentLocale = languages.find(
      locale => pathName.startsWith(`/${locale}/`) || pathName === `/${locale}`
    );

    let newPath;

    if (currentLocale) {
      // Replace the current locale with the new one
      newPath = pathName.replace(`/${currentLocale}`, `/${newLocale}`);
    } else {
      // If no locale in the path, add the new locale at the beginning
      newPath = `/${newLocale}${pathName}`;
    }

    router.push(newPath);
  };

  // Detect current language from path
  useEffect(() => {
    const detectedLang = languages.find(
      locale => pathName.startsWith(`/${locale}/`) || pathName === `/${locale}`
    );

    if (detectedLang) {
      setCurrentLang(detectedLang);
    }
  }, [pathName]);

  // Simple flag emoji mapping
  const flagEmojis: FlagMap = {
    en: '🇺🇸',
    es: '🇪🇸',
  };

  // Language names mapping
  const languageNames: FlagMap = {
    en: 'English',
    es: 'Español',
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center justify-center gap-1 px-2 h-8 rounded-full border border-gray-200 bg-white/80 text-xs font-medium text-gray-600 hover:bg-gray-50 backdrop-blur-sm">
        <span>{flagEmojis[currentLang]}</span>
        <span>{currentLang.toUpperCase()}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        {languages.map(lang => (
          <DropdownMenuItem
            key={lang}
            className={`flex items-center gap-2 text-sm cursor-pointer ${
              lang === currentLang ? 'bg-purple-50 text-purple-600 font-medium' : ''
            }`}
            onClick={() => handleLanguageChange(lang)}
          >
            <span>{flagEmojis[lang]}</span>
            {languageNames[lang]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
