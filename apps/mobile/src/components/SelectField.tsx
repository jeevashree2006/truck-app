import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { tint } from '@/theme/theme';
import { useTheme } from '@/theme/ThemeProvider';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

interface SelectFieldProps<T extends string> {
  label?: string;
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
}

/** Horizontal chip selector — compact alternative to a native picker. */
export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: SelectFieldProps<T>) {
  const { theme } = useTheme();
  return (
    <View style={styles.wrap}>
      {label && <Text style={[styles.label, { color: theme.colors.muted }]}>{label}</Text>}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {options.map((opt) => {
          const selected = opt.value === value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => onChange(opt.value)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={[
                styles.chip,
                {
                  backgroundColor: selected ? tint(theme.colors.primary, 0.14) : theme.colors.inputBg,
                  borderColor: selected ? theme.colors.primary : theme.colors.border,
                  borderRadius: theme.radius.pill,
                },
              ]}
            >
              {opt.icon && (
                <Ionicons
                  name={opt.icon}
                  size={15}
                  color={selected ? theme.colors.primary : theme.colors.muted}
                />
              )}
              <Text
                style={[
                  styles.chipText,
                  { color: selected ? theme.colors.primary : theme.colors.text },
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 9, marginLeft: 2 },
  row: { gap: 8, paddingRight: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderWidth: 1.5,
  },
  chipText: { fontSize: 14, fontWeight: '600' },
});
