import React, { useEffect } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/theme/ThemeProvider';
import { clamp01 } from '@/utils/format';

interface ProgressBarProps {
  /** 0..1 */
  progress: number;
  color: string;
  /** Track height. */
  height?: number;
  trackColor?: string;
  style?: ViewStyle;
  /** Disable the fill animation (e.g. inside fast lists). */
  animated?: boolean;
}

/** Animated horizontal progress bar; the fill width tweens on mount/update. */
export function ProgressBar({
  progress,
  color,
  height = 8,
  trackColor,
  style,
  animated = true,
}: ProgressBarProps) {
  const { theme } = useTheme();
  const value = useSharedValue(animated ? 0 : clamp01(progress));

  useEffect(() => {
    const target = clamp01(progress);
    if (animated) {
      value.value = withTiming(target, { duration: 700 });
    } else {
      value.value = target;
    }
  }, [progress, animated, value]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${value.value * 100}%`,
  }));

  return (
    <View
      style={[
        styles.track,
        {
          height,
          borderRadius: height,
          backgroundColor: trackColor ?? theme.colors.inputBg,
        },
        style,
      ]}
    >
      <Animated.View
        style={[styles.fill, { backgroundColor: color, borderRadius: height }, fillStyle]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', overflow: 'hidden' },
  fill: { height: '100%' },
});
