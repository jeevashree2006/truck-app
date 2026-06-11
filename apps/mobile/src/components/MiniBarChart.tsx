import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/theme/ThemeProvider';

export interface BarDatum {
  label: string;
  value: number;
  /** Optional secondary value drawn as a lighter overlay (e.g. expense vs revenue). */
  secondary?: number;
}

interface MiniBarChartProps {
  data: BarDatum[];
  height?: number;
  color?: string;
  secondaryColor?: string;
  /** Formatter for the value shown on the tallest bar / axis. */
  formatValue?: (v: number) => string;
}

/** Compact animated bar chart. Bars grow from the baseline on mount. */
export function MiniBarChart({
  data,
  height = 130,
  color,
  secondaryColor,
  formatValue,
}: MiniBarChartProps) {
  const { theme } = useTheme();
  const barColor = color ?? theme.colors.primary;
  const secColor = secondaryColor ?? theme.colors.accent;
  const max = Math.max(1, ...data.map((d) => Math.max(d.value, d.secondary ?? 0)));

  return (
    <View>
      <View style={[styles.chart, { height }]}>
        {data.map((d, i) => (
          <View key={`${d.label}-${i}`} style={styles.column}>
            <View style={styles.barsRow}>
              {d.secondary !== undefined && (
                <Bar
                  fraction={d.secondary / max}
                  color={secColor}
                  index={i}
                  maxHeight={height - 22}
                  width={8}
                />
              )}
              <Bar
                fraction={d.value / max}
                color={barColor}
                index={i}
                maxHeight={height - 22}
                width={d.secondary !== undefined ? 8 : 14}
              />
            </View>
            <Text style={[styles.label, { color: theme.colors.muted }]}>{d.label}</Text>
          </View>
        ))}
      </View>
      {formatValue && (
        <Text style={[styles.peak, { color: theme.colors.muted }]}>peak {formatValue(max)}</Text>
      )}
    </View>
  );
}

interface BarProps {
  fraction: number;
  color: string;
  index: number;
  maxHeight: number;
  width: number;
}

function Bar({ fraction, color, index, maxHeight, width }: BarProps) {
  const grow = useSharedValue(0);

  useEffect(() => {
    grow.value = withDelay(index * 60, withTiming(Math.max(0, Math.min(1, fraction)), { duration: 600 }));
  }, [fraction, index, grow]);

  const style = useAnimatedStyle(() => ({
    height: Math.max(3, grow.value * maxHeight),
  }));

  return <Animated.View style={[{ width, backgroundColor: color, borderRadius: 6 }, style]} />;
}

const styles = StyleSheet.create({
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  column: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  barsRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  label: { fontSize: 11, fontWeight: '600' },
  peak: { fontSize: 11, marginTop: 8, textAlign: 'right' },
});
