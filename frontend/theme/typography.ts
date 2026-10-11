import { TextStyle } from 'react-native';

export const typography: Record<string, TextStyle> = {
  display: { fontSize: 32, fontWeight: '700', letterSpacing: -0.5 },
  h1: { fontSize: 26, fontWeight: '700', letterSpacing: -0.4 },
  h2: { fontSize: 20, fontWeight: '600' },
  h3: { fontSize: 17, fontWeight: '600' },
  body: { fontSize: 15, fontWeight: '400' },
  bodyStrong: { fontSize: 15, fontWeight: '600' },
  caption: { fontSize: 13, fontWeight: '400' },
  small: { fontSize: 12, fontWeight: '500' },
};