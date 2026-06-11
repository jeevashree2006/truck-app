import React from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
  type ViewStyle,
} from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';

interface ScreenProps {
  children: React.ReactNode;
  /** Render inside a ScrollView (default true). */
  scroll?: boolean;
  /** Safe-area edges to apply. Defaults to top/left/right (tabs handle bottom). */
  edges?: Edge[];
  contentContainerStyle?: ViewStyle;
  style?: ViewStyle;
  scrollProps?: Omit<ScrollViewProps, 'children' | 'contentContainerStyle' | 'style'>;
  /** Disable horizontal padding (for full-bleed headers). */
  noPadding?: boolean;
}

/**
 * Safe-area aware screen wrapper that applies the theme background and
 * consistent horizontal padding.
 */
export function Screen({
  children,
  scroll = true,
  edges = ['top', 'left', 'right'],
  contentContainerStyle,
  style,
  scrollProps,
  noPadding = false,
}: ScreenProps) {
  const { theme } = useTheme();
  const padding = noPadding ? undefined : { paddingHorizontal: theme.spacing.lg };

  if (scroll) {
    return (
      <SafeAreaView edges={edges} style={[styles.flex, { backgroundColor: theme.colors.bg }, style]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            padding,
            { paddingBottom: theme.spacing.xxxl },
            contentContainerStyle,
          ]}
          {...scrollProps}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={edges} style={[styles.flex, { backgroundColor: theme.colors.bg }, style]}>
      <View style={[styles.flex, padding, contentContainerStyle]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
