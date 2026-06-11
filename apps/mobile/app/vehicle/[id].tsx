import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { api } from '@/api/client';
import {
  Button,
  DocStatusChip,
  EmptyState,
  GradientHeader,
  LoadCard,
  ProgressBar,
  Screen,
  SectionCard,
  SelectField,
  StatusChip,
} from '@/components';
import type { SelectOption } from '@/components';
import { useAsync } from '@/hooks/useAsync';
import { docStatusColor } from '@/theme/theme';
import { useTheme } from '@/theme/ThemeProvider';
import type { VehicleStatus } from '@/types';
import { VEHICLE_STATUSES, documentLabels, vehicleStatusMeta, vehicleTypeSummary } from '@/utils/domain';
import { formatCurrency, formatShortDate } from '@/utils/format';

type Tab = 'loads' | 'repairs' | 'documents';

const STATUS_OPTIONS: SelectOption<VehicleStatus>[] = VEHICLE_STATUSES.map((s) => ({ value: s, label: vehicleStatusMeta[s].label }));

export default function VehicleDetailScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const vehicleId = id ?? '';

  const vehicle = useAsync(() => api.getVehicle(vehicleId), [vehicleId]);
  const loads = useAsync(() => api.listLoads({ vehicleId }), [vehicleId]);
  const repairs = useAsync(() => api.listRepairs(vehicleId), [vehicleId]);
  const [tab, setTab] = useState<Tab>('loads');
  const v = vehicle.data;

  const startLoad = async () => {
    const load = await api.createLoad({ vehicle_id: vehicleId });
    router.push(`/loads/${load.id}`);
  };

  const setStatus = async (status: VehicleStatus) => {
    await api.updateStatus(vehicleId, status);
    vehicle.reload(true);
  };

  const remove = () => {
    Alert.alert('Delete vehicle?', 'This removes the vehicle and all its loads & repairs.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await api.deleteVehicle(vehicleId); router.back(); } },
    ]);
  };

  if (!v) {
    return (
      <Screen noPadding>
        <GradientHeader title="Vehicle" compact onBack={() => router.back()} />
        <View style={{ padding: 24 }}><Text style={{ color: theme.colors.muted }}>Loading…</Text></View>
      </Screen>
    );
  }

  const tabs: { key: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'loads', label: 'Loads', icon: 'layers' },
    { key: 'repairs', label: 'Repairs', icon: 'construct' },
    { key: 'documents', label: 'Documents', icon: 'document-text' },
  ];

  return (
    <Screen noPadding>
      <GradientHeader
        title={v.registration_number}
        subtitle={vehicleTypeSummary(v)}
        compact
        onBack={() => router.back()}
        right={<Pressable onPress={remove}><Ionicons name="trash-outline" size={20} color="#fff" /></Pressable>}
      >
        <View style={styles.heroRow}>
          <StatusChip status={v.status} style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
          <DocStatusChip status={v.overall_doc_status} size="sm" />
        </View>
        <View style={styles.heroStats}>
          <View><Text style={styles.heroLabel}>Lifetime profit</Text><Text style={styles.heroValue}>{formatCurrency(v.total_profit)}</Text></View>
          <View><Text style={styles.heroLabel}>Trips</Text><Text style={styles.heroValue}>{v.trips_count}</Text></View>
        </View>
      </GradientHeader>

      <View style={{ paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.lg, paddingBottom: 40, gap: theme.spacing.lg }}>
        <SelectField<VehicleStatus> label="Status" value={v.status} options={STATUS_OPTIONS} onChange={setStatus} />

        <View style={[styles.tabs, { backgroundColor: theme.colors.inputBg }]}>
          {tabs.map((tb) => (
            <Pressable key={tb.key} onPress={() => setTab(tb.key)} style={[styles.tab, tab === tb.key && { backgroundColor: theme.colors.card }]}>
              <Ionicons name={tb.icon} size={15} color={tab === tb.key ? theme.colors.primary : theme.colors.muted} />
              <Text style={[styles.tabText, { color: tab === tb.key ? theme.colors.text : theme.colors.muted }]}>{tb.label}</Text>
            </Pressable>
          ))}
        </View>

        {tab === 'loads' && (
          <View>
            <Button title="New Load" onPress={startLoad} icon="add" />
            <View style={{ height: 14 }} />
            {(loads.data ?? []).length === 0 ? (
              <EmptyState icon="layers" title="No loads yet" subtitle="Create a new load to record rent, diesel, advances and profit." />
            ) : (
              (loads.data ?? []).map((l, i) => <LoadCard key={l.id} load={l} index={i} onPress={() => router.push(`/loads/${l.id}`)} />)
            )}
          </View>
        )}

        {tab === 'repairs' && (
          <SectionCard title="Repairs" flush style={{ padding: theme.spacing.lg }}>
            {(repairs.data ?? []).length === 0 ? (
              <Text style={{ color: theme.colors.muted }}>No repairs logged.</Text>
            ) : (
              (repairs.data ?? []).map((r) => (
                <View key={r.id} style={[styles.repair, { borderColor: theme.colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.colors.text, fontWeight: '700' }}>{r.description}</Text>
                    <Text style={{ color: theme.colors.muted, fontSize: 12 }}>{formatShortDate(r.date)}{r.vendor ? ` · ${r.vendor}` : ''}</Text>
                  </View>
                  <Text style={{ color: theme.colors.text, fontWeight: '800' }}>{formatCurrency(r.amount)}</Text>
                </View>
              ))
            )}
          </SectionCard>
        )}

        {tab === 'documents' && (
          <SectionCard title="Documents" flush style={{ padding: theme.spacing.lg, gap: 16 }}>
            {v.document_statuses.map((d) => (
              <View key={d.type}>
                <View style={styles.docRow}>
                  <Text style={{ color: theme.colors.text, fontWeight: '700' }}>{documentLabels[d.type]}</Text>
                  <DocStatusChip status={d.status} size="sm" />
                </View>
                <ProgressBar progress={d.progress ?? 0} color={d.status === 'unknown' ? theme.colors.border : docStatusColor(d.status)} />
                <Text style={{ color: theme.colors.muted, fontSize: 11, marginTop: 4 }}>
                  {d.expiry_date ? `Expires ${formatShortDate(d.expiry_date)}` : 'No expiry set'}
                  {d.days_to_expiry != null ? d.days_to_expiry < 0 ? ` · expired ${Math.abs(d.days_to_expiry)}d ago` : ` · ${d.days_to_expiry}d left` : ''}
                </Text>
              </View>
            ))}
          </SectionCard>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroRow: { flexDirection: 'row', gap: 8, marginTop: 12, alignItems: 'center' },
  heroStats: { flexDirection: 'row', gap: 28, marginTop: 14 },
  heroLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  heroValue: { color: '#fff', fontSize: 18, fontWeight: '800', marginTop: 2 },
  tabs: { flexDirection: 'row', padding: 4, borderRadius: 14, gap: 4 },
  tab: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingVertical: 9, borderRadius: 11 },
  tabText: { fontSize: 13, fontWeight: '700' },
  repair: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, gap: 12 },
  docRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
});
