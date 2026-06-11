import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, G } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';
import { clamp01 } from '@/utils/format';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ProgressRingProps {
  /** 0..1 */
  progress: number;
  color: string;
  size?: number;
  strokeWidth?: number;
  /** Text shown in the center (e.g. percentage). */
  centerText?: string;
}

/** Animated circular progress indicator (a single-arc ring). */
export function ProgressRing({
  progress,
  color,
  size = 56,
  strokeWidth = 6,
  centerText,
}: ProgressRingProps) {
  const { theme } = useTheme();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  const animated = useSharedValue(0);

  useEffect(() => {
    animated.value = withTiming(clamp01(progress), { duration: 800 });
  }, [progress, animated]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - animated.value),
  }));

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={theme.colors.inputBg}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <G rotation={-90} origin={`${center}, ${center}`}>
          <AnimatedCircle
            cx={center}
            cy={center}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="transparent"
            strokeDasharray={circumference}
            animatedProps={animatedProps}
          />
        </G>
      </Svg>
      {centerText !== undefined && (
        <View style={styles.center} pointerEvents="none">
          <Text style={[styles.centerText, { color: theme.colors.text }]}>{centerText}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  centerText: { fontSize: 13, fontWeight: '800' },
});
