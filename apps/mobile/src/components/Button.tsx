import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { useTheme } from '@/theme/ThemeProvider';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
  fullWidth?: boolean;
}

/** Primary CTA with gradient fill + spring press feedback, plus subtle variants. */
export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
  style,
  fullWidth = true,
}: ButtonProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);
  const isDisabled = disabled || loading;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn = () => {
    if (!isDisabled) scale.value = withSpring(0.96, { damping: 14, stiffness: 240 });
  };
  const onPressOut = () => {
    scale.value = withSpring(1, { damping: 14, stiffness: 240 });
  };

  const content = (
    <>
      {loading ? (
        <ActivityIndicator color={variant === 'primary' || variant === 'danger' ? '#fff' : theme.colors.primary} />
      ) : (
        <>
          {icon && (
            <Ionicons
              name={icon}
              size={18}
              color={textColor(variant, theme.colors.primary, theme.colors.text)}
            />
          )}
          <Text style={[styles.label, { color: textColor(variant, theme.colors.primary, theme.colors.text) }]}>
            {title}
          </Text>
        </>
      )}
    </>
  );

  const base: ViewStyle = {
    opacity: isDisabled ? 0.55 : 1,
    width: fullWidth ? '100%' : undefined,
    borderRadius: theme.radius.md,
  };

  if (variant === 'primary') {
    return (
      <AnimatedPressable
        onPress={isDisabled ? undefined : onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled }}
        style={[animatedStyle, base, theme.shadow.sm, style]}
      >
        <LinearGradient
          colors={[theme.brandGradient[0], theme.brandGradient[1]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.inner, { borderRadius: theme.radius.md }]}
        >
          {content}
        </LinearGradient>
      </AnimatedPressable>
    );
  }

  const bg =
    variant === 'danger'
      ? theme.colors.expired
      : variant === 'secondary'
        ? theme.colors.inputBg
        : 'transparent';

  return (
    <AnimatedPressable
      onPress={isDisabled ? undefined : onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      style={[
        animatedStyle,
        base,
        styles.inner,
        {
          backgroundColor: bg,
          borderRadius: theme.radius.md,
          borderWidth: variant === 'ghost' ? StyleSheet.hairlineWidth : 0,
          borderColor: theme.colors.border,
        },
        style,
      ]}
    >
      <View style={styles.row}>{content}</View>
    </AnimatedPressable>
  );
}

function textColor(variant: Variant, primary: string, text: string): string {
  if (variant === 'primary' || variant === 'danger') return '#fff';
  if (variant === 'ghost') return text;
  return primary;
}

const styles = StyleSheet.create({
  inner: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  label: { fontSize: 16, fontWeight: '700' },
});
