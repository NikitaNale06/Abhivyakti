import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Language {
  code: string;
  name: string;
  native: string;
}

export const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা' },
];

interface LanguageContextValue {
  language: Language;
  setLanguage: (code: string) => void;
}

const STORAGE_KEY = '@abhivyakti/language';
const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [code, setCode] = useState('en');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v && LANGUAGES.find((l) => l.code === v)) setCode(v);
    });
  }, []);

  const setLanguage = (c: string) => {
    setCode(c);
    AsyncStorage.setItem(STORAGE_KEY, c);
  };

  const language = useMemo(
    () => LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0],
    [code],
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be inside LanguageProvider');
  return ctx;
}