import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { DocStatusChip } from '@/components/DocStatusChip';
import { StatusChip } from '@/components/StatusChip';
import { useTheme } from '@/theme/ThemeProvider';
import type { Vehicle } from '@/types';
import { formatCompactCurrency } from '@/utils/format';
import { vehicleTypeSummary } from '@/utils/domain';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface VehicleCardProps {
  vehicle: Vehicle;
  onPress: () => void;
  index?: number;
}

/** Tappable vehicle summary card with gradient thumbnail, status + profit. */
export function VehicleCard({ vehicle, onPress, index = 0 }: VehicleCardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const expiring = vehicle.document_statuses.filter((d) => d.status === 'expiring' || d.status === 'expired').length;

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).springify().damping(16)}>
      <AnimatedPressable
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.97, { damping: 14, stiffness: 240 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 14, stiffness: 240 }); }}
        accessibilityRole="button"
        style={[animatedStyle, styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, borderRadius: theme.radius.xl }, theme.shadow.sm]}
      >
        <LinearGradient colors={[theme.brandGradient[0], theme.brandGradient[1]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.thumb}>
          <Ionicons name="bus" size={26} color="#fff" />
        </LinearGradient>

        <View style={styles.body}>
          <Text style={[styles.reg, { color: theme.colors.text }]} numberOfLines={1}>{vehicle.registration_number}</Text>
          <Text style={[styles.subtitle, { color: theme.colors.muted }]} numberOfLines={1}>{vehicleTypeSummary(vehicle)}</Text>
          <View style={styles.metaRow}>
            <StatusChip status={vehicle.status} />
            <DocStatusChip status={vehicle.overall_doc_status} size="sm" />
          </View>
        </View>

        <View style={styles.right}>
          <Text style={[styles.profit, { color: theme.colors.valid }]}>{formatCompactCurrency(vehicle.total_profit)}</Text>
          <Text style={[styles.trips, { color: theme.colors.muted }]}>{vehicle.trips_count} trips</Text>
          {expiring > 0 && <Text style={[styles.flag, { color: theme.colors.expiring }]}>{expiring} docs</Text>}
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', padding: 12, borderWidth: StyleSheet.hairlineWidth, marginBottom: 12 },
  thumb: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, marginLeft: 14 },
  reg: { fontSize: 16, fontWeight: '800', letterSpacing: 0.2 },
  subtitle: { fontSize: 12, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  right: { alignItems: 'flex-end', gap: 3, marginLeft: 8 },
  profit: { fontSize: 15, fontWeight: '800' },
  trips: { fontSize: 11 },
  flag: { fontSize: 11, fontWeight: '700' },
});
