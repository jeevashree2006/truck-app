import { useRouter } from 'expo-router';
import React from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';

import { api } from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';
import {
  DonutChart,
  GradientHeader,
  KpiCard,
  MiniBarChart,
  ReminderCardView,
  Screen,
  SectionCard,
} from '@/components';
import type { DonutSlice } from '@/components';
import { useAsync } from '@/hooks/useAsync';
import { useTheme } from '@/theme/ThemeProvider';
import { spendColors } from '@/utils/domain';
import { formatCompactCurrency, formatCurrency } from '@/utils/format';

export default function DashboardScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const dash = useAsync(() => api.dashboard(6), []);
  const reminders = useAsync(() => api.reminders(), []);
  const k = dash.data?.kpis;

  const slices: DonutSlice[] = (dash.data?.spend_breakdown ?? []).map((s) => ({
    key: s.category,
    label: s.label,
    value: s.amount,
    color: spendColors[s.category] ?? theme.colors.unknown,
  }));
  const totalSpend = slices.reduce((a, s) => a + s.value, 0);

  return (
    <Screen
      noPadding
      scrollProps={{
        refreshControl: (
          <RefreshControl refreshing={false} onRefresh={() => { dash.reload(true); reminders.reload(true); }} tintColor={theme.colors.primary} />
        ),
      }}
    >
      <GradientHeader
        eyebrow={`Welcome back, ${user?.name?.split(' ')[0] ?? 'Owner'} 👋`}
        title="Your fleet today"
        subtitle="Profit, loads and document alerts at a glance."
      >
        <View style={styles.heroStats}>
          <HeroStat label="Profit (month)" value={formatCurrency(k?.profit_this_month)} />
          <HeroStat label="Rent (month)" value={formatCurrency(k?.rent_this_month)} />
          <HeroStat label="All-time" value={formatCurrency(k?.profit_all_time)} />
        </View>
      </GradientHeader>

      <View style={{ paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.lg }}>
        <View style={styles.kpiGrid}>
          <View style={styles.kpiItem}><KpiCard index={0} label="Vehicles" value={k?.total_vehicles ?? 0} icon="bus" color="#2563eb" /></View>
          <View style={styles.kpiItem}><KpiCard index={1} label="On the way" value={k?.vehicles_on_way ?? 0} icon="navigate" color="#7c3aed" /></View>
          <View style={styles.kpiItem}><KpiCard index={2} label="Active loads" value={k?.active_loads ?? 0} icon="layers" color="#16a34a" /></View>
          <View style={styles.kpiItem}><KpiCard index={3} label="Docs expiring" value={k?.documents_expiring ?? 0} icon="alert-circle" color="#f59e0b" /></View>
        </View>

        <SectionCard title="Rent vs Profit" subtitle="Last 6 months" icon="bar-chart" style={{ marginTop: theme.spacing.lg }}>
          <MiniBarChart
            data={(dash.data?.monthly ?? []).map((m) => ({ label: m.label, value: m.profit, secondary: m.rent }))}
            color={theme.colors.valid}
            secondaryColor={theme.colors.primary}
            formatValue={formatCompactCurrency}
          />
        </SectionCard>

        <SectionCard title="Spend Breakdown" subtitle="Completed trips" icon="pie-chart" style={{ marginTop: theme.spacing.lg }}>
          <DonutChart slices={slices} centerValue={formatCompactCurrency(totalSpend)} centerLabel="Spend" />
        </SectionCard>

        <SectionCard title="Document Alerts" icon="notifications" style={{ marginTop: theme.spacing.lg, marginBottom: theme.spacing.xxl }}>
          {reminders.data && reminders.data.length > 0 ? (
            reminders.data.slice(0, 5).map((r, i) => (
              <ReminderCardView key={i} reminder={r} index={i} onPress={r.vehicle_id ? () => router.push(`/vehicle/${r.vehicle_id}`) : undefined} />
            ))
          ) : (
            <View style={[styles.allClear, { backgroundColor: theme.colors.valid + '14' }]}>
              <Text style={{ color: theme.colors.valid, fontWeight: '600' }}>All documents valid 🎉</Text>
            </View>
          )}
        </SectionCard>
      </View>
    </Screen>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text style={styles.heroLabel}>{label}</Text>
      <Text style={styles.heroValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heroStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, marginTop: 16 },
  heroLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  heroValue: { color: '#fff', fontSize: 18, fontWeight: '800', marginTop: 2 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  kpiItem: { width: '47%', flexGrow: 1 },
  allClear: { padding: 16, borderRadius: 14 },
});
