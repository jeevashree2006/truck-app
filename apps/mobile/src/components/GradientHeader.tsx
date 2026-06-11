import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';

interface GradientHeaderProps {
  title: string;
  subtitle?: string;
  /** Optional eyebrow line above the title (e.g. greeting). */
  eyebrow?: string;
  /** Show a back button (uses router.back via onBack). */
  onBack?: () => void;
  right?: React.ReactNode;
  children?: React.ReactNode;
  style?: ViewStyle;
  /** Smaller header variant for stack screens. */
  compact?: boolean;
}

/** Brand gradient header with safe-area top padding and rounded bottom corners. */
export function GradientHeader({
  title,
  subtitle,
  eyebrow,
  onBack,
  right,
  children,
  style,
  compact = false,
}: GradientHeaderProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={[theme.brandGradient[0], theme.brandGradient[1]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.container,
        {
          paddingTop: insets.top + (compact ? 8 : 16),
          paddingBottom: compact ? 18 : 26,
          borderBottomLeftRadius: theme.radius.xl + 6,
          borderBottomRightRadius: theme.radius.xl + 6,
        },
        theme.shadow.md,
        style,
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.titleArea}>
          {onBack && (
            <Pressable
              onPress={onBack}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
            >
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </Pressable>
          )}
          <Animated.View entering={FadeInDown.springify().damping(18)} style={styles.titleColumn}>
            {eyebrow && <Text style={styles.eyebrow}>{eyebrow}</Text>}
            <Text style={[styles.title, compact && styles.titleCompact]} numberOfLines={1}>
              {title}
            </Text>
            {subtitle && (
              <Text style={styles.subtitle} numberOfLines={2}>
                {subtitle}
              </Text>
            )}
          </Animated.View>
        </View>
        {right && <View style={styles.right}>{right}</View>}
      </View>
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 18,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  titleArea: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 6 },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    marginRight: 4,
  },
  pressed: { opacity: 0.6 },
  titleColumn: { flex: 1 },
  eyebrow: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  title: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  titleCompact: { fontSize: 21 },
  subtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  right: { marginLeft: 12, justifyContent: 'center' },
});
