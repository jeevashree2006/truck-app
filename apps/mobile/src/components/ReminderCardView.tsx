import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';

import { severityColor, tint } from '@/theme/theme';
import { useTheme } from '@/theme/ThemeProvider';
import type { ReminderCard } from '@/types';

const TYPE_ICON: Record<ReminderCard['type'], keyof typeof Ionicons.glyphMap> = {
  document_expiry: 'document-text',
  daily_summary: 'sunny',
  system: 'notifications',
};

interface ReminderCardViewProps {
  reminder: ReminderCard;
  onPress?: () => void;
  index?: number;
}

/** Severity-coloured reminder card with a leading accent stripe. */
export function ReminderCardView({ reminder, onPress, index = 0 }: ReminderCardViewProps) {
  const { theme } = useTheme();
  const color = severityColor(reminder.severity);

  return (
    <Animated.View entering={FadeInRight.delay(index * 70).springify().damping(16)}>
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole={onPress ? 'button' : undefined}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.lg,
            opacity: pressed ? 0.85 : 1,
          },
          theme.shadow.sm,
        ]}
      >
        <View style={[styles.stripe, { backgroundColor: color }]} />
        <View style={[styles.iconWrap, { backgroundColor: tint(color, 0.14) }]}>
          <Ionicons name={TYPE_ICON[reminder.type]} size={18} color={color} />
        </View>
        <View style={styles.body}>
          <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={1}>
            {reminder.title}
          </Text>
          <Text style={[styles.bodyText, { color: theme.colors.muted }]} numberOfLines={2}>
            {reminder.body}
          </Text>
        </View>
        {onPress && <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    paddingLeft: 18,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
    overflow: 'hidden',
  },
  stripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  body: { flex: 1 },
  title: { fontSize: 15, fontWeight: '700' },
  bodyText: { fontSize: 13, marginTop: 3, lineHeight: 18 },
});
