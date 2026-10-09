import { BarlowCondensed_700Bold } from '@expo-google-fonts/barlow-condensed/700Bold';
import { BarlowCondensed_800ExtraBold } from '@expo-google-fonts/barlow-condensed/800ExtraBold';
import { BarlowCondensed_800ExtraBold_Italic } from '@expo-google-fonts/barlow-condensed/800ExtraBold_Italic';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { Inter_800ExtraBold } from '@expo-google-fonts/inter/800ExtraBold';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { createContext, useContext } from 'react';
import { Text as RNText, StyleSheet, type TextProps, type TextStyle } from 'react-native';

/** Everything the app needs loaded before the first screen. */
export const FONTS = {
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  BarlowCondensed_700Bold,
  BarlowCondensed_800ExtraBold,
  BarlowCondensed_800ExtraBold_Italic,
  ...MaterialCommunityIcons.font,
};

/**
 * Use `fontFamily: DISPLAY` in a style for the condensed sports face (numbers,
 * scores, big titles). Everything else is Inter.
 */
export const DISPLAY = 'display';

const BODY: Record<string, string> = {
  '400': 'Inter_500Medium',
  '500': 'Inter_500Medium',
  '600': 'Inter_600SemiBold',
  '700': 'Inter_700Bold',
  '800': 'Inter_800ExtraBold',
  '900': 'Inter_800ExtraBold',
  normal: 'Inter_500Medium',
  bold: 'Inter_700Bold',
};

const HEAVY = new Set(['800', '900', 'bold']);

// Custom fonts ship one file per weight, and Android ignores fontWeight for them,
// so each weight maps to its own family. Nested text inherits unless it says otherwise.
const Nested = createContext(false);

export function Text({ style, children, ...rest }: TextProps) {
  const nested = useContext(Nested);
  const flat = (StyleSheet.flatten(style) ?? {}) as TextStyle;
  const weight = flat.fontWeight === undefined ? undefined : String(flat.fontWeight);
  let family: TextStyle | null = null;
  if (flat.fontFamily === DISPLAY) {
    const italic = flat.fontStyle === 'italic';
    family = {
      fontFamily: italic
        ? 'BarlowCondensed_800ExtraBold_Italic'
        : weight && !HEAVY.has(weight)
          ? 'BarlowCondensed_700Bold'
          : 'BarlowCondensed_800ExtraBold',
      fontWeight: 'normal',
      fontStyle: 'normal',
    };
  } else if (weight || !nested) {
    family = { fontFamily: BODY[weight ?? '500'] ?? BODY['500'], fontWeight: 'normal' };
  }
  return (
    <Nested.Provider value>
      <RNText {...rest} style={[style, family]}>
        {children}
      </RNText>
    </Nested.Provider>
  );
}
