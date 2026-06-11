import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { api } from '@/api/client';
import { EmptyState, GradientHeader, Screen, SectionCard } from '@/components';
import { useAsync } from '@/hooks/useAsync';
import { tint } from '@/theme/theme';
import { useTheme } from '@/theme/ThemeProvider';
import { tripStatusMeta } from '@/utils/domain';
import { formatCompactCurrency, formatCurrency } from '@/utils/format';
import type { TripProfitRow } from '@/types';

export default function ProfitScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { data, loading, reload } = useAsync(() => api.profitByVehicle(), []);
  const [expanded, setExpanded] = useState<string | null>(null);

  const totalProfit = (data ?? []).reduce((a, v) => a + v.total_profit, 0);
  const totalTrips = (data ?? []).reduce((a, v) => a + v.trips_count, 0);

  return (
    <Screen
      noPadding
      scrollProps={{ refreshControl: <RefreshControl refreshing={false} onRefresh={() => reload(true)} tintColor={theme.colors.primary} /> }}
    >
      <GradientHeader title="Profit by Vehicle" subtitle="Tap a vehicle to see every trip's profit.">
        <View style={styles.heroStats}>
          <View><Text style={styles.heroLabel}>Total profit</Text><Text style={styles.heroValue}>{formatCurrency(totalProfit)}</Text></View>
          <View><Text style={styles.heroLabel}>Completed trips</Text><Text style={styles.heroValue}>{totalTrips}</Text></View>
        </View>
      </GradientHeader>

      <View style={{ paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.lg, paddingBottom: 120 }}>
        {!loading && (data ?? []).length === 0 ? (
          <EmptyState icon="trending-up" title="No data yet" subtitle="Add a vehicle and complete a load to see profit." />
        ) : (
          (data ?? []).map((v, i) => (
            <Animated.View key={v.vehicle_id} entering={FadeInDown.delay(i * 50).springify().damping(16)}>
              <SectionCard flush style={{ marginBottom: 12, overflow: 'hidden' }}>
                <Pressable
                  onPress={() => setExpanded(expanded === v.vehicle_id ? null : v.vehicle_id)}
                  style={({ pressed }) => [styles.row, { padding: theme.spacing.lg, opacity: pressed ? 0.85 : 1 }]}
                >
                  <View style={[styles.icon, { backgroundColor: tint(theme.colors.primary, 0.12) }]}>
                    <Ionicons name="bus" size={20} color={theme.colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.reg, { color: theme.colors.text }]}>{v.registration_number}</Text>
                    <Text style={[styles.sub, { color: theme.colors.muted }]}>{v.trips_count} trips · avg {formatCompactCurrency(v.avg_profit)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.profit, { color: v.total_profit >= 0 ? theme.colors.valid : theme.colors.expired }]}>{formatCurrency(v.total_profit)}</Text>
                    <Text style={[styles.sub, { color: theme.colors.muted }]}>Rent {formatCompactCurrency(v.total_rent)}</Text>
                  </View>
                  <Ionicons name={expanded === v.vehicle_id ? 'chevron-up' : 'chevron-down'} size={18} color={theme.colors.muted} style={{ marginLeft: 8 }} />
                </Pressable>
                {expanded === v.vehicle_id && <VehicleTrips vehicleId={v.vehicle_id} onOpen={(id) => router.push(`/loads/${id}`)} />}
              </SectionCard>
            </Animated.View>
          ))
        )}
      </View>
    </Screen>
  );
}

function VehicleTrips({ vehicleId, onOpen }: { vehicleId: string; onOpen: (loadId: string) => void }) {
  const { theme } = useTheme();
  const { data, loading } = useAsync(() => api.vehicleTrips(vehicleId), [vehicleId]);

  if (loading) return <Text style={{ color: theme.colors.muted, padding: theme.spacing.lg }}>Loading…</Text>;
  if (!data || data.length === 0) return <Text style={{ color: theme.colors.muted, padding: theme.spacing.lg }}>No trips yet.</Text>;

  return (
    <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border }}>
      {data.map((trip: TripProfitRow) => {
        const meta = tripStatusMeta[trip.status as keyof typeof tripStatusMeta] ?? tripStatusMeta.completed;
        return (
          <Pressable key={trip.load_id} onPress={() => onOpen(trip.load_id)} style={({ pressed }) => [styles.tripRow, { borderTopColor: theme.colors.border, opacity: pressed ? 0.7 : 1 }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.reg, { color: theme.colors.text, fontSize: 14 }]} numberOfLines={1}>{trip.route}</Text>
              <Text style={[styles.sub, { color: meta.color }]}>{meta.label} · Spend {formatCompactCurrency(trip.spend)}</Text>
            </View>
            <Text style={[styles.profit, { color: trip.profit >= 0 ? theme.colors.valid : theme.colors.expired, fontSize: 14 }]}>{formatCurrency(trip.profit)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  heroStats: { flexDirection: 'row', gap: 28, marginTop: 16 },
  heroLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  heroValue: { color: '#fff', fontSize: 20, fontWeight: '800', marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center' },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  reg: { fontSize: 15, fontWeight: '800' },
  sub: { fontSize: 12, marginTop: 2 },
  profit: { fontSize: 15, fontWeight: '800' },
  tripRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth },
});
