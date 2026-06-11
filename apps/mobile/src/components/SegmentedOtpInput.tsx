import React, { useEffect, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Text } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

interface SegmentedOtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  /** Fired when the final digit is entered. */
  onComplete?: (value: string) => void;
  autoFocus?: boolean;
  error?: boolean;
}

/**
 * Segmented OTP entry. Renders `length` boxes but is driven by a single hidden
 * TextInput so paste / autofill of SMS codes works on both platforms.
 */
export function SegmentedOtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  autoFocus = true,
  error = false,
}: SegmentedOtpInputProps) {
  const { theme } = useTheme();
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (value.length === length) {
      onComplete?.(value);
    }
  }, [value, length, onComplete]);

  const handleChange = (text: string) => {
    const digits = text.replace(/[^0-9]/g, '').slice(0, length);
    onChange(digits);
  };

  const focus = () => inputRef.current?.focus();

  return (
    <Pressable onPress={focus} style={styles.container}>
      {Array.from({ length }).map((_, i) => (
        <OtpCell
          key={i}
          digit={value[i] ?? ''}
          active={focused && i === Math.min(value.length, length - 1)}
          filled={i < value.length}
          error={error}
        />
      ))}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
        maxLength={length}
        autoFocus={autoFocus}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={styles.hiddenInput}
        caretHidden
      />
    </Pressable>
  );
}

interface OtpCellProps {
  digit: string;
  active: boolean;
  filled: boolean;
  error: boolean;
}

function OtpCell({ digit, active, filled, error }: OtpCellProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);
  const borderProgress = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(digit ? 1.06 : 1, { damping: 12, stiffness: 260 });
    if (digit) {
      scale.value = withSpring(1, { damping: 12, stiffness: 260 });
    }
  }, [digit, scale]);

  useEffect(() => {
    borderProgress.value = withTiming(active ? 1 : 0, { duration: 180 });
  }, [active, borderProgress]);

  const borderColor = error
    ? theme.colors.expired
    : active
      ? theme.colors.primary
      : filled
        ? theme.colors.primaryAlt
        : theme.colors.border;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.cell,
        animatedStyle,
        {
          backgroundColor: theme.colors.inputBg,
          borderColor,
          borderWidth: active || filled ? 2 : StyleSheet.hairlineWidth,
        },
      ]}
    >
      <Text style={[styles.cellText, { color: theme.colors.text }]}>{digit}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  cell: {
    flex: 1,
    aspectRatio: 0.82,
    maxWidth: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellText: { fontSize: 24, fontWeight: '800' },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
});
