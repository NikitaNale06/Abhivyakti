export type ThemeMode = 'light' | 'dark';

export interface ColorPalette {
  primary: string;
  primaryPressed: string;
  primarySoft: string;
  background: string;
  backgroundSecondary: string;
  surface: string;
  surfaceElevated: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  borderStrong: string;
  success: string;
  warning: string;
  error: string;
  overlay: string;
}

export const lightColors: ColorPalette = {
  primary: '#F45B16',
  primaryPressed: '#D9470B',
  primarySoft: '#FFF1E8',
  background: '#FFFFFF',
  backgroundSecondary: '#FFF8F3',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  textPrimary: '#171717',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#ECE7E2',
  borderStrong: '#D8D2CC',
  success: '#16845B',
  warning: '#C77700',
  error: '#C7382A',
  overlay: 'rgba(0,0,0,0.45)',
};

export const darkColors: ColorPalette = {
  primary: '#FF7A3D',
  primaryPressed: '#F45B16',
  primarySoft: '#2A1A10',
  background: '#0B0B0C',
  backgroundSecondary: '#141416',
  surface: '#1A1A1D',
  surfaceElevated: '#222226',
  textPrimary: '#F5F5F5',
  textSecondary: '#B0B0B5',
  textMuted: '#7A7A80',
  border: '#26262B',
  borderStrong: '#38383F',
  success: '#3DBB85',
  warning: '#E0A33D',
  error: '#E5615A',
  overlay: 'rgba(0,0,0,0.65)',
};

export const colors = { light: lightColors, dark: darkColors };