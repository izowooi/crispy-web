'use client';

import { Language, languageNames } from '@/lib/i18n';

interface LanguageToggleProps {
  currentLanguage: Language;
  onLanguageChange: (lang: Language) => void;
}

export default function LanguageToggle({ currentLanguage, onLanguageChange }: LanguageToggleProps) {
  const languages: Language[] = ['ko', 'en'];

  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
      {languages.map((lang) => (
        <button
          key={lang}
          onClick={() => onLanguageChange(lang)}
          className={`
            px-3 py-1.5 text-sm font-medium rounded-md transition-all
            ${currentLanguage === lang
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
            }
          `}
        >
          {languageNames[lang]}
        </button>
      ))}
    </div>
  );
}
