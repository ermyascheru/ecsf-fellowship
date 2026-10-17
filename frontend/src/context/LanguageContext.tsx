import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, Language } from '../locales/translations';

interface LanguageContextType {
  language: Language;
  isAmharic: boolean;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('ecsf_language');
    if (saved === 'am' || saved === 'en') return saved;
    return 'en';
  });

  useEffect(() => {
    localStorage.setItem('ecsf_language', language);
    document.documentElement.lang = language === 'am' ? 'am' : 'en';
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const toggleLanguage = () => {
    setLanguageState((prev) => (prev === 'en' ? 'am' : 'en'));
  };

  const t = (key: string, fallback?: string): string => {
    const dict = translations[language];
    if (dict && dict[key]) {
      return dict[key];
    }
    // Fallback to English dictionary
    if (translations.en[key]) {
      return translations.en[key];
    }
    return fallback || key;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        isAmharic: language === 'am',
        setLanguage,
        toggleLanguage,
        t,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
