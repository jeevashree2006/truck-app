import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { tint } from '@/theme/theme';
import type { VehicleStatus } from '@/types';
import { vehicleStatusMeta } from '@/utils/domain';

interface StatusChipProps {
  status: VehicleStatus;
  style?: ViewStyle;
}

/** Vehicle operational-status pill (empty / on the way / waiting / maintenance). */
export function StatusChip({ status, style }: StatusChipProps) {
  const meta = vehicleStatusMeta[status];
  return (
    <View style={[styles.chip, { backgroundColor: tint(meta.color, 0.14) }, style]}>
      <View style={[styles.dot, { backgroundColor: meta.color }]} />
      <Text style={[styles.text, { color: meta.color }]}>{meta.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4, paddingHorizontal: 9, borderRadius: 999, alignSelf: 'flex-start' },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontSize: 12, fontWeight: '700' },
});
