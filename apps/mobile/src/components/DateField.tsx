import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { formatDate, parseDate, toISODate } from '@/utils/format';

interface DateFieldProps {
  label?: string;
  /** ISO date string (YYYY-MM-DD) or null. */
  value: string | null;
  onChange: (value: string) => void;
  optional?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}

/** Date picker field that surfaces a friendly formatted value. */
export function DateField({
  label,
  value,
  onChange,
  optional = false,
  icon = 'calendar',
}: DateFieldProps) {
  const { theme } = useTheme();
  const [show, setShow] = useState(false);
  const current = parseDate(value) ?? new Date();

  const handleChange = (event: DateTimePickerEvent, selected?: Date) => {
    // On Android the picker is a modal that closes itself.
    if (Platform.OS !== 'ios') setShow(false);
    if (event.type === 'set' && selected) {
      onChange(toISODate(selected));
    }
  };

  return (
    <View style={styles.wrap}>
      {label && (
        <Text style={[styles.label, { color: theme.colors.muted }]}>
          {label}
          {optional && <Text style={{ color: theme.colors.muted }}> · optional</Text>}
        </Text>
      )}
      <Pressable
        onPress={() => setShow(true)}
        accessibilityRole="button"
        style={[
          styles.field,
          {
            backgroundColor: theme.colors.inputBg,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.md,
          },
        ]}
      >
        <Ionicons name={icon} size={18} color={theme.colors.muted} />
        <Text
          style={[
            styles.value,
            { color: value ? theme.colors.text : theme.colors.muted },
          ]}
        >
          {value ? formatDate(value) : 'Select date'}
        </Text>
        <Ionicons name="chevron-down" size={16} color={theme.colors.muted} />
      </Pressable>
      {show && (
        <DateTimePicker
          value={current}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={handleChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 7, marginLeft: 2 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    minHeight: 52,
    borderWidth: 1.5,
  },
  value: { flex: 1, fontSize: 16 },
});
