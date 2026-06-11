import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

interface SectionCardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  right?: React.ReactNode;
  style?: ViewStyle;
  /** Remove inner padding (e.g. for full-bleed lists). */
  flush?: boolean;
}

/** Rounded, soft-shadowed surface used to group related content. */
export function SectionCard({
  children,
  title,
  subtitle,
  icon,
  right,
  style,
  flush = false,
}: SectionCardProps) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.xl,
          padding: flush ? 0 : theme.spacing.lg,
        },
        theme.shadow.sm,
        style,
      ]}
    >
      {(title || right) && (
        <View style={[styles.header, flush && { padding: theme.spacing.lg, paddingBottom: theme.spacing.sm }]}>
          <View style={styles.headerLeft}>
            {icon && (
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: theme.colors.inputBg, borderRadius: theme.radius.sm },
                ]}
              >
                <Ionicons name={icon} size={16} color={theme.colors.primary} />
              </View>
            )}
            <View style={styles.titleColumn}>
              {title && (
                <Text
                  style={[
                    styles.title,
                    { color: theme.colors.text, fontSize: theme.fontSize.lg },
                  ]}
                >
                  {title}
                </Text>
              )}
              {subtitle && (
                <Text style={[styles.subtitle, { color: theme.colors.muted }]}>{subtitle}</Text>
              )}
            </View>
          </View>
          {right}
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconWrap: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleColumn: { flex: 1 },
  title: { fontWeight: '700' },
  subtitle: { fontSize: 12, marginTop: 2 },
});
