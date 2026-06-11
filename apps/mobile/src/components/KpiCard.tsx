import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useCountUp } from '@/hooks/useCountUp';
import { tint } from '@/theme/theme';
import { useTheme } from '@/theme/ThemeProvider';

interface KpiCardProps {
  label: string;
  /** Raw numeric value used for the count-up animation. */
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
  /** Accent colour for the icon + emphasis. */
  color?: string;
  /**
   * Format the animated number into a display string (e.g. currency).
   * Defaults to a localized integer.
   */
  format?: (v: number) => string;
  /** Small caption under the value (e.g. unit). */
  caption?: string;
  /** Stagger index for entrance animation. */
  index?: number;
}

/** Animated KPI tile with count-up number and tinted icon badge. */
export function KpiCard({
  label,
  value,
  icon,
  color,
  format,
  caption,
  index = 0,
}: KpiCardProps) {
  const { theme } = useTheme();
  const accent = color ?? theme.colors.primary;
  const animated = useCountUp(value);
  const display = format ? format(animated) : Math.round(animated).toLocaleString('en-IN');

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 70).springify().damping(16)}
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.lg,
        },
        theme.shadow.sm,
      ]}
    >
      <View style={[styles.iconBadge, { backgroundColor: tint(accent, 0.14) }]}>
        <Ionicons name={icon} size={18} color={accent} />
      </View>
      <Text style={[styles.value, { color: theme.colors.text }]} numberOfLines={1}>
        {display}
      </Text>
      <Text style={[styles.label, { color: theme.colors.muted }]} numberOfLines={1}>
        {label}
      </Text>
      {caption && (
        <Text style={[styles.caption, { color: accent }]} numberOfLines={1}>
          {caption}
        </Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 0,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  value: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  label: { fontSize: 12.5, fontWeight: '600', marginTop: 3 },
  caption: { fontSize: 11, fontWeight: '700', marginTop: 4 },
});
