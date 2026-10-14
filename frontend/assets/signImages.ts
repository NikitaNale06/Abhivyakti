// Static mapping of ISL reference images from assets/img
// Metro bundler requires static string literals inside require() calls.

export const ALPHABET_IMAGES: Record<string, any> = {
  A: require('./img/A.jpg'),
  B: require('./img/B.jpg'),
  C: require('./img/C.jpg'),
  D: require('./img/D.jpg'),
  E: require('./img/E.jpg'),
  F: require('./img/F.jpg'),
  G: require('./img/G.jpg'),
  H: require('./img/H.jpg'),
  I: require('./img/I.jpg'),
  J: require('./img/J.jpg'),
  K: require('./img/K.jpg'),
  L: require('./img/L.jpg'),
  M: require('./img/M.jpg'),
  N: require('./img/N.jpg'),
  O: require('./img/O.jpg'),
  P: require('./img/P.jpg'),
  Q: require('./img/Q.jpg'),
  R: require('./img/R.jpg'),
  S: require('./img/S.jpg'),
  T: require('./img/T.jpg'),
  U: require('./img/U.jpg'),
  V: require('./img/V.jpg'),
  W: require('./img/W.jpg'),
  X: require('./img/X.jpg'),
  Y: require('./img/Y.jpg'),
  Z: require('./img/Z.jpg'),
};

export const NUMBER_IMAGES: Record<string, any> = {
  '1': require('./img/1.jpg'),
  '2': require('./img/2.jpg'),
  '3': require('./img/3.jpg'),
  '4': require('./img/4.jpg'),
  '5': require('./img/5.jpg'),
  '6': require('./img/6.jpg'),
  '7': require('./img/7.jpg'),
  '8': require('./img/8.jpg'),
  '9': require('./img/9.jpg'),
};

export function getAlphabetImage(letter: string): any {
  if (!letter) return null;
  const key = letter.trim().toUpperCase();
  return ALPHABET_IMAGES[key] || null;
}

export function getNumberImage(num: string | number): any {
  if (num === undefined || num === null) return null;
  const key = String(num).trim();
  return NUMBER_IMAGES[key] || null;
}
