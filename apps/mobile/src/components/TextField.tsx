import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

interface TextFieldProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  autoComplete?: TextInputProps['autoComplete'];
  icon?: keyof typeof Ionicons.glyphMap;
  helper?: string;
  error?: string;
  multiline?: boolean;
  optional?: boolean;
  style?: ViewStyle;
  editable?: boolean;
  returnKeyType?: TextInputProps['returnKeyType'];
  onSubmitEditing?: () => void;
}

/** Labelled text input with icon, focus ring and helper/error text. */
export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize = 'sentences',
  autoComplete,
  icon,
  helper,
  error,
  multiline = false,
  optional = false,
  style,
  editable = true,
  returnKeyType,
  onSubmitEditing,
}: TextFieldProps) {
  const { theme } = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? theme.colors.expired
    : focused
      ? theme.colors.primary
      : theme.colors.border;

  return (
    <View style={[styles.wrap, style]}>
      {label && (
        <Text style={[styles.label, { color: theme.colors.muted }]}>
          {label}
          {optional && <Text style={{ color: theme.colors.muted }}> · optional</Text>}
        </Text>
      )}
      <View
        style={[
          styles.field,
          {
            backgroundColor: theme.colors.inputBg,
            borderColor,
            borderRadius: theme.radius.md,
            alignItems: multiline ? 'flex-start' : 'center',
            opacity: editable ? 1 : 0.6,
          },
        ]}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={18}
            color={focused ? theme.colors.primary : theme.colors.muted}
            style={{ marginTop: multiline ? 2 : 0 }}
          />
        )}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.muted}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          editable={editable}
          multiline={multiline}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[
            styles.input,
            { color: theme.colors.text },
            multiline && styles.multiline,
          ]}
        />
      </View>
      {(helper || error) && (
        <Text style={[styles.helper, { color: error ? theme.colors.expired : theme.colors.muted }]}>
          {error ?? helper}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 7, marginLeft: 2 },
  field: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    minHeight: 52,
    borderWidth: 1.5,
  },
  input: { flex: 1, fontSize: 16, paddingVertical: 14 },
  multiline: { minHeight: 84, textAlignVertical: 'top' },
  helper: { fontSize: 12, marginTop: 6, marginLeft: 2 },
});
