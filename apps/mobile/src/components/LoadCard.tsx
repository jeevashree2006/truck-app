import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { tint } from '@/theme/theme';
import { useTheme } from '@/theme/ThemeProvider';
import type { Load } from '@/types';
import { formatCompactCurrency, formatShortDate } from '@/utils/format';
import { tripStatusMeta } from '@/utils/domain';

interface LoadCardProps {
  load: Load;
  onPress: () => void;
  index?: number;
}

/** Load (trip) summary row with route, rent/spend and profit. */
export function LoadCard({ load, onPress, index = 0 }: LoadCardProps) {
  const { theme } = useTheme();
  const meta = tripStatusMeta[load.status];
  const profitColor = load.totals.profit >= 0 ? theme.colors.valid : theme.colors.expired;

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).springify().damping(16)}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, borderRadius: theme.radius.lg, opacity: pressed ? 0.85 : 1 }, theme.shadow.sm]}
      >
        <View style={[styles.icon, { backgroundColor: tint(theme.colors.primary, 0.12) }]}>
          <Ionicons name={load.totals.leg_count > 1 ? 'git-branch' : 'location'} size={18} color={theme.colors.primary} />
        </View>
        <View style={styles.body}>
          <Text style={[styles.route, { color: theme.colors.text }]} numberOfLines={1}>{load.route || 'New load'}</Text>
          <Text style={[styles.meta, { color: theme.colors.muted }]} numberOfLines={1}>
            {formatShortDate(load.start_date)} · Rent {formatCompactCurrency(load.totals.total_rent)} · Spend {formatCompactCurrency(load.totals.spend)}
          </Text>
        </View>
        <View style={styles.right}>
          <Text style={[styles.profit, { color: profitColor }]}>{formatCompactCurrency(load.totals.profit)}</Text>
          <View style={[styles.badge, { backgroundColor: tint(meta.color, 0.14) }]}>
            <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', padding: 12, borderWidth: StyleSheet.hairlineWidth, marginBottom: 10 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  body: { flex: 1 },
  route: { fontSize: 14, fontWeight: '700' },
  meta: { fontSize: 12, marginTop: 3 },
  right: { alignItems: 'flex-end', gap: 5, marginLeft: 8 },
  profit: { fontSize: 15, fontWeight: '800' },
  badge: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 999 },
  badgeText: { fontSize: 11, fontWeight: '700' },
});
