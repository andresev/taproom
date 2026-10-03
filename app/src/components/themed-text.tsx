import { StyleSheet, Text, type TextProps } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { Type, type ThemeColor } from '@/theme';

/** The type scale's roles (theme/index.ts), plus the names screens used before docs/0020. */
export type TextType =
  | keyof typeof Type
  | 'default'
  | 'smallBold'
  | 'subtitle'
  | 'link'
  | 'linkPrimary'
  | 'code';

export type ThemedTextProps = TextProps & {
  type?: TextType;
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  const linkColor = type === 'linkPrimary' ? theme.accentText : undefined;

  return <Text style={[{ color: linkColor ?? theme[themeColor ?? 'text'] }, styles[type], style]} {...rest} />;
}

const styles = StyleSheet.create({
  ...Type,
  // Earlier names, mapped onto the scale.
  default: Type.body,
  smallBold: Type.label,
  subtitle: Type.title,
  link: Type.label,
  linkPrimary: Type.label,
  code: Type.monoSmall,
});
