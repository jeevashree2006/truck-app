import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tint } from '@/theme/theme';
import { useTheme } from '@/theme/ThemeProvider';

type IconName = keyof typeof Ionicons.glyphMap;

const TAB_ICONS: Record<string, { active: IconName; inactive: IconName; label: string }> = {
  index: { active: 'grid', inactive: 'grid-outline', label: 'Dashboard' },
  vehicles: { active: 'bus', inactive: 'bus-outline', label: 'Vehicles' },
  profit: { active: 'trending-up', inactive: 'trending-up-outline', label: 'Profit' },
  more: { active: 'ellipsis-horizontal-circle', inactive: 'ellipsis-horizontal-circle-outline', label: 'More' },
};

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: theme.colors.card,
          borderTopColor: theme.colors.border,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
        },
        theme.shadow.lg,
      ]}
    >
      {state.routes.map((route, index) => {
        const config = TAB_ICONS[route.name];
        if (!config) return null;
        const focused = state.index === index;

        const onPress = () => {
          if (Platform.OS !== 'web') {
            Haptics.selectionAsync().catch(() => undefined);
          }
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TabButton
            key={route.key}
            focused={focused}
            icon={focused ? config.active : config.inactive}
            label={config.label}
            color={focused ? theme.colors.primary : theme.colors.muted}
            indicatorColor={tint(theme.colors.primary, 0.14)}
            onPress={onPress}
          />
        );
      })}
    </View>
  );
}

interface TabButtonProps {
  focused: boolean;
  icon: IconName;
  label: string;
  color: string;
  indicatorColor: string;
  onPress: () => void;
}

function TabButton({ focused, icon, label, color, indicatorColor, onPress }: TabButtonProps) {
  const scale = useSharedValue(focused ? 1 : 0);

  React.useEffect(() => {
    scale.value = withSpring(focused ? 1 : 0, { damping: 14, stiffness: 220 });
  }, [focused, scale]);

  const indicatorStyle = useAnimatedStyle(() => ({
    opacity: scale.value,
    transform: [{ scale: 0.8 + scale.value * 0.2 }],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -scale.value * 2 }],
  }));

  return (
    <Pressable
      onPress={onPress}
      style={styles.tab}
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
    >
      <View style={styles.tabInner}>
        <Animated.View style={[styles.indicator, { backgroundColor: indicatorColor }, indicatorStyle]} />
        <Animated.View style={iconStyle}>
          <Ionicons name={icon} size={23} color={color} />
        </Animated.View>
      </View>
      <Text style={[styles.label, { color, fontWeight: focused ? '700' : '500' }]}>{label}</Text>
    </Pressable>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="vehicles" />
      <Tabs.Screen name="profit" />
      <Tabs.Screen name="more" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  tabInner: { width: 56, height: 32, alignItems: 'center', justifyContent: 'center' },
  indicator: {
    position: 'absolute',
    width: 56,
    height: 32,
    borderRadius: 16,
  },
  label: { fontSize: 11 },
});
