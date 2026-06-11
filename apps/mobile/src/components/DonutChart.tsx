import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, G } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface DonutSlice {
  key: string;
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  slices: DonutSlice[];
  size?: number;
  strokeWidth?: number;
  /** Center content (e.g. total). */
  centerLabel?: string;
  centerValue?: string;
}

interface AnimatedArcProps {
  slice: DonutSlice;
  radius: number;
  circumference: number;
  strokeWidth: number;
  center: number;
  /** Fraction (0..1) of the ring where this arc starts. */
  startFraction: number;
  /** Fraction (0..1) length of this arc. */
  lengthFraction: number;
  delay: number;
}

function AnimatedArc({
  slice,
  radius,
  circumference,
  strokeWidth,
  center,
  startFraction,
  lengthFraction,
  delay,
}: AnimatedArcProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, { duration: 800 });
  }, [progress, lengthFraction]);

  const animatedProps = useAnimatedProps(() => {
    const visibleLength = lengthFraction * circumference * progress.value;
    return {
      strokeDasharray: `${visibleLength} ${circumference}`,
      strokeDashoffset: -startFraction * circumference,
    };
  });

  return (
    <AnimatedCircle
      cx={center}
      cy={center}
      r={radius}
      stroke={slice.color}
      strokeWidth={strokeWidth}
      strokeLinecap="butt"
      fill="transparent"
      animatedProps={animatedProps}
    />
  );
}

/** Animated SVG donut chart. Arcs sweep in on mount. */
export function DonutChart({
  slices,
  size = 180,
  strokeWidth = 26,
  centerLabel,
  centerValue,
}: DonutChartProps) {
  const { theme } = useTheme();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const total = slices.reduce((acc, s) => acc + s.value, 0);
  const valid = slices.filter((s) => s.value > 0);

  let cumulative = 0;
  const arcs = valid.map((slice, i) => {
    const fraction = total > 0 ? slice.value / total : 0;
    const start = cumulative;
    cumulative += fraction;
    return (
      <AnimatedArc
        key={slice.key}
        slice={slice}
        radius={radius}
        circumference={circumference}
        strokeWidth={strokeWidth}
        center={center}
        startFraction={start}
        lengthFraction={fraction}
        delay={i * 60}
      />
    );
  });

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* track */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={theme.colors.inputBg}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* rotate so arcs start at 12 o'clock */}
        <G rotation={-90} origin={`${center}, ${center}`}>
          {arcs}
        </G>
      </Svg>
      <View style={styles.center} pointerEvents="none">
        {centerValue && (
          <Text style={[styles.centerValue, { color: theme.colors.text }]}>{centerValue}</Text>
        )}
        {centerLabel && (
          <Text style={[styles.centerLabel, { color: theme.colors.muted }]}>{centerLabel}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  centerValue: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  centerLabel: { fontSize: 12, marginTop: 2, fontWeight: '600' },
});
