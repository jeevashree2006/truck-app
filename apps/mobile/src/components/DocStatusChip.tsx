import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { useT } from '@/i18n';
import { docStatusColor, tint } from '@/theme/theme';
import type { DocStatus } from '@/types';

const ICONS: Record<DocStatus, keyof typeof Ionicons.glyphMap> = {
  valid: 'checkmark-circle',
  expiring: 'time',
  expired: 'alert-circle',
  unknown: 'help-circle',
};

interface DocStatusChipProps {
  status: DocStatus;
  size?: 'sm' | 'md';
  /** Override the label (defaults to localized status name). */
  label?: string;
  style?: ViewStyle;
}

/** Pill showing a colour-coded document status with icon + label. */
export function DocStatusChip({ status, size = 'md', label, style }: DocStatusChipProps) {
  const t = useT();
  const color = docStatusColor(status);
  const small = size === 'sm';
  const text = label ?? t(`docs.${status}`);

  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: tint(color, 0.14),
          paddingVertical: small ? 3 : 5,
          paddingHorizontal: small ? 8 : 10,
          borderRadius: 999,
        },
        style,
      ]}
    >
      <Ionicons name={ICONS[status]} size={small ? 12 : 14} color={color} />
      <Text
        style={[
          styles.label,
          { color, fontSize: small ? 11 : 12 },
        ]}
      >
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  label: { fontWeight: '700' },
});
