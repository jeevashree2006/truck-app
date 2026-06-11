import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { api } from '@/api/client';
import { Button, GradientHeader, Screen, SectionCard, TextField } from '@/components';
import { useAsync } from '@/hooks/useAsync';
import { tint } from '@/theme/theme';
import { useTheme } from '@/theme/ThemeProvider';
import type { Leg, MoneyEntry } from '@/types';
import { computeLeg, computeTotals, routeSummary } from '@/utils/domain';
import { formatCurrency } from '@/utils/format';

const blankLeg = (): Leg => ({ loading_point: '', unloading_point: '', total_rent: 0, commission: 0, driver_salary: 0, fastag: 0, diesel: [], advance: [] });

export default function LoadEditorScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const loadId = id ?? '';
  const load = useAsync(() => api.getLoad(loadId), [loadId]);

  const [legs, setLegs] = useState<Leg[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (load.data) setLegs(load.data.legs.length ? load.data.legs : [blankLeg()]);
  }, [load.data]);

  const totals = computeTotals(legs);
  const completed = load.data?.status === 'completed';

  const patchLeg = (i: number, patch: Partial<Leg>) => setLegs((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const num = (v: string) => Number(v.replace(/[^0-9.]/g, '')) || 0;

  const save = async () => {
    setSaving(true);
    try { await api.updateLoad(loadId, { legs }); load.reload(true); } finally { setSaving(false); }
  };

  const closeTrip = () => {
    Alert.alert(
      'Close this trip?',
      `Final profit ${formatCurrency(totals.profit)}. Expected driver balance ${formatCurrency(totals.expected_driver_balance)}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm & close',
          onPress: async () => {
            await api.updateLoad(loadId, { legs });
            await api.closeLoad(loadId, { driver_balance: totals.expected_driver_balance });
            router.back();
          },
        },
      ],
    );
  };

  if (!load.data) {
    return (
      <Screen noPadding>
        <GradientHeader title="Load" compact onBack={() => router.back()} />
        <View style={{ padding: 24 }}><Text style={{ color: theme.colors.muted }}>Loading…</Text></View>
      </Screen>
    );
  }

  return (
    <Screen noPadding>
      <GradientHeader
        title={routeSummary(legs) || 'New load'}
        subtitle={`${load.data.vehicle_registration ?? ''} · ${completed ? 'Completed' : 'Ongoing'}`}
        compact
        onBack={() => router.back()}
        right={!completed ? <Pressable onPress={save}><Ionicons name="save-outline" size={20} color="#fff" /></Pressable> : undefined}
      >
        <View style={styles.totalsRow}>
          <Tot label="Rent" value={formatCurrency(totals.total_rent)} />
          <Tot label="Spend" value={formatCurrency(totals.spend)} />
          <Tot label="Profit" value={formatCurrency(totals.profit)} />
        </View>
      </GradientHeader>

      <View style={{ paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.lg, paddingBottom: 40, gap: theme.spacing.lg }}>
        {completed && (
          <View style={[styles.banner, { backgroundColor: tint(theme.colors.valid, 0.12) }]}>
            <Ionicons name="checkmark-circle" size={18} color={theme.colors.valid} />
            <Text style={{ color: theme.colors.valid, fontWeight: '600' }}>Trip closed{load.data.driver_balance != null ? ` · driver returned ${formatCurrency(load.data.driver_balance)}` : ''}</Text>
          </View>
        )}

        {legs.map((leg, i) => {
          const c = computeLeg(leg);
          return (
            <SectionCard key={i} title={i === 0 ? 'Outbound load' : `Return load ${i}`} icon="cube" style={{ gap: 12 }}
              right={legs.length > 1 && !completed ? (
                <Pressable onPress={() => setLegs((p) => p.filter((_, idx) => idx !== i))}><Ionicons name="trash-outline" size={18} color={theme.colors.expired} /></Pressable>
              ) : undefined}
            >
              <TextField label="Loading point" value={leg.loading_point} onChangeText={(v) => patchLeg(i, { loading_point: v })} placeholder="Namakkal" editable={!completed} icon="location" />
              <TextField label="Unloading point" value={leg.unloading_point} onChangeText={(v) => patchLeg(i, { unloading_point: v })} placeholder="Mumbai" editable={!completed} icon="flag" />
              <View style={styles.grid2}>
                <Money label="Total rent" value={leg.total_rent} onChange={(n) => patchLeg(i, { total_rent: n })} editable={!completed} theme={theme} num={num} />
                <Money label="Commission" value={leg.commission} onChange={(n) => patchLeg(i, { commission: n })} editable={!completed} theme={theme} num={num} />
                <Money label="Driver salary" value={leg.driver_salary} onChange={(n) => patchLeg(i, { driver_salary: n })} editable={!completed} theme={theme} num={num} />
                <Money label="FASTag" value={leg.fastag} onChange={(n) => patchLeg(i, { fastag: n })} editable={!completed} theme={theme} num={num} />
              </View>

              <MoneyRows label="Diesel" color="#8b5cf6" entries={leg.diesel} editable={!completed} onChange={(d) => patchLeg(i, { diesel: d })} theme={theme} num={num} />
              <MoneyRows label="Advance" color="#06b6d4" entries={leg.advance} editable={!completed} onChange={(a) => patchLeg(i, { advance: a })} theme={theme} num={num} />

              <View style={[styles.legSummary, { backgroundColor: theme.colors.inputBg }]}>
                <Text style={{ color: theme.colors.muted, fontSize: 13 }}>Leg spend {formatCurrency(c.spend)}</Text>
                <Text style={{ color: (c.profit ?? 0) >= 0 ? theme.colors.valid : theme.colors.expired, fontWeight: '800' }}>Profit {formatCurrency(c.profit)}</Text>
              </View>
            </SectionCard>
          );
        })}

        {!completed && (
          <Pressable onPress={() => setLegs((p) => [...p, blankLeg()])} style={[styles.addLeg, { borderColor: theme.colors.primary }]}>
            <Ionicons name="add" size={18} color={theme.colors.primary} />
            <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>Add return load (e.g. Mumbai → Madurai)</Text>
          </Pressable>
        )}

        <SectionCard title="Trip settlement" icon="wallet" style={{ gap: 6 }}>
          <Row label="Total advance" value={formatCurrency(totals.total_advance)} theme={theme} />
          <Row label="Diesel + FASTag" value={formatCurrency(totals.total_diesel + totals.total_fastag)} theme={theme} />
          <Row label="Expected balance" value={formatCurrency(totals.expected_driver_balance)} theme={theme} />
          <Row label="Returned" value={load.data.driver_balance != null ? formatCurrency(load.data.driver_balance) : '—'} theme={theme} />
        </SectionCard>

        {!completed && (
          <View style={{ gap: 10 }}>
            <Button title={saving ? 'Saving…' : 'Save'} onPress={save} loading={saving} variant="secondary" icon="save" />
            <Button title="Close trip" onPress={closeTrip} icon="checkmark-done" />
          </View>
        )}
      </View>
    </Screen>
  );
}

function Tot({ label, value }: { label: string; value: string }) {
  return <View><Text style={styles.totLabel}>{label}</Text><Text style={styles.totValue}>{value}</Text></View>;
}
function Row({ label, value, theme }: { label: string; value: string; theme: any }) {
  return (
    <View style={styles.kvRow}>
      <Text style={{ color: theme.colors.muted }}>{label}</Text>
      <Text style={{ color: theme.colors.text, fontWeight: '700' }}>{value}</Text>
    </View>
  );
}
function Money({ label, value, onChange, editable, theme, num }: { label: string; value: number; onChange: (n: number) => void; editable: boolean; theme: any; num: (v: string) => number }) {
  return (
    <View style={{ width: '47%', flexGrow: 1 }}>
      <Text style={[styles.mLabel, { color: theme.colors.muted }]}>{label}</Text>
      <TextInput
        value={value ? String(value) : ''}
        onChangeText={(t) => onChange(num(t))}
        editable={editable}
        keyboardType="number-pad"
        placeholder="0"
        placeholderTextColor={theme.colors.muted}
        style={[styles.mInput, { backgroundColor: theme.colors.inputBg, color: theme.colors.text, borderColor: theme.colors.border }]}
      />
    </View>
  );
}
function MoneyRows({ label, color, entries, editable, onChange, theme, num }: { label: string; color: string; entries: MoneyEntry[]; editable: boolean; onChange: (e: MoneyEntry[]) => void; theme: any; num: (v: string) => number }) {
  const total = entries.reduce((a, e) => a + (e.amount || 0), 0);
  return (
    <View style={[styles.rows, { borderColor: theme.colors.border }]}>
      <View style={styles.rowsHead}>
        <Text style={{ color, fontWeight: '800', fontSize: 12 }}>{label.toUpperCase()}</Text>
        <Text style={{ color, fontWeight: '800' }}>{formatCurrency(total)}</Text>
      </View>
      {entries.map((e, i) => (
        <View key={i} style={styles.entryRow}>
          <TextInput
            value={e.amount ? String(e.amount) : ''}
            onChangeText={(t) => onChange(entries.map((x, idx) => (idx === i ? { ...x, amount: num(t) } : x)))}
            editable={editable}
            keyboardType="number-pad"
            placeholder="Amount"
            placeholderTextColor={theme.colors.muted}
            style={[styles.entryInput, { backgroundColor: theme.colors.inputBg, color: theme.colors.text, borderColor: theme.colors.border }]}
          />
          {editable && (
            <Pressable onPress={() => onChange(entries.filter((_, idx) => idx !== i))}><Ionicons name="close" size={18} color={theme.colors.muted} /></Pressable>
          )}
        </View>
      ))}
      {editable && (
        <Pressable onPress={() => onChange([...entries, { amount: 0 }])} style={styles.addEntry}>
          <Ionicons name="add" size={15} color={color} />
          <Text style={{ color, fontWeight: '700', fontSize: 13 }}>Add {label.toLowerCase()}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  totalsRow: { flexDirection: 'row', gap: 24, marginTop: 14 },
  totLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  totValue: { color: '#fff', fontSize: 16, fontWeight: '800', marginTop: 2 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14 },
  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  mLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase' },
  mInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, fontWeight: '600' },
  rows: { borderWidth: 1, borderRadius: 12, padding: 10, gap: 8 },
  rowsHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  entryRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  entryInput: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14 },
  addEntry: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4 },
  legSummary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 12 },
  addLeg: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 16, paddingVertical: 16 },
  kvRow: { flexDirection: 'row', justifyContent: 'space-between' },
});
