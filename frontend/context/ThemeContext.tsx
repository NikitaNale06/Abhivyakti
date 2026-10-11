import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, ColorPalette, ThemeMode } from '@/theme/colors';

type ThemePreference = 'system' | 'light' | 'dark';

interface ThemeContextValue {
  colors: ColorPalette;
  mode: ThemeMode;
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
  toggle: () => void;
}

const STORAGE_KEY = '@abhivyakti/theme_pref';

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v: string | null) => {
      if (v === 'light' || v === 'dark' || v === 'system') setPreferenceState(v);
    });
  }, []);

  const setPreference = (p: ThemePreference) => {
    setPreferenceState(p);
    AsyncStorage.setItem(STORAGE_KEY, p);
  };

  const mode: ThemeMode =
    preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;

  const toggle = () => setPreference(mode === 'dark' ? 'light' : 'dark');

  const value = useMemo(
    () => ({ colors: colors[mode], mode, preference, setPreference, toggle }),
    [mode, preference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be inside ThemeProvider');
  return ctx;
}