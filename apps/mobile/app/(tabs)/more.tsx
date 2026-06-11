import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { Button, GradientHeader, Screen, SectionCard } from '@/components';
import { SUPPORTED_LOCALES, useI18n } from '@/i18n';
import { tint } from '@/theme/theme';
import { useTheme, type ThemePreference } from '@/theme/ThemeProvider';

const THEME_OPTS: { key: ThemePreference; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'light', label: 'Light', icon: 'sunny' },
  { key: 'dark', label: 'Dark', icon: 'moon' },
  { key: 'system', label: 'System', icon: 'phone-portrait' },
];

export default function MoreScreen() {
  const { theme, preference, setPreference } = useTheme();
  const { locale, setLocale } = useI18n();
  const { user, logout } = useAuth();

  return (
    <Screen noPadding>
      <GradientHeader title="More" subtitle="Profile, appearance & language." />

      <View style={{ paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.lg, gap: theme.spacing.lg, paddingBottom: 120 }}>
        <SectionCard title="Profile">
          <View style={styles.profile}>
            <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.avatarText}>{(user?.name || user?.mobile || 'FO').slice(0, 2).toUpperCase()}</Text>
            </View>
            <View>
              <Text style={[styles.name, { color: theme.colors.text }]}>{user?.name ?? 'Fleet Owner'}</Text>
              {!!user?.mobile && <Text style={[styles.meta, { color: theme.colors.muted }]}>📱 {user.mobile}</Text>}
              {!!user?.email && <Text style={[styles.meta, { color: theme.colors.muted }]}>✉️ {user.email}</Text>}
            </View>
          </View>
        </SectionCard>

        <SectionCard title="Appearance" icon="color-palette">
          <Text style={[styles.label, { color: theme.colors.muted }]}>Theme</Text>
          <View style={styles.options}>
            {THEME_OPTS.map((o) => {
              const active = preference === o.key;
              return (
                <Pressable key={o.key} onPress={() => setPreference(o.key)} style={[styles.option, { borderColor: active ? theme.colors.primary : theme.colors.border, backgroundColor: active ? tint(theme.colors.primary, 0.1) : 'transparent' }]}>
                  <Ionicons name={o.icon} size={18} color={active ? theme.colors.primary : theme.colors.muted} />
                  <Text style={[styles.optionText, { color: active ? theme.colors.primary : theme.colors.muted }]}>{o.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.label, { color: theme.colors.muted, marginTop: 18 }]}>Language</Text>
          <View style={styles.options}>
            {SUPPORTED_LOCALES.map((l) => {
              const active = locale === l.code;
              return (
                <Pressable key={l.code} onPress={() => setLocale(l.code)} style={[styles.option, { borderColor: active ? theme.colors.primary : theme.colors.border, backgroundColor: active ? tint(theme.colors.primary, 0.1) : 'transparent' }]}>
                  <Text style={[styles.optionText, { color: active ? theme.colors.primary : theme.colors.muted }]}>{l.native}</Text>
                </Pressable>
              );
            })}
          </View>
        </SectionCard>

        <Button title="Log out" onPress={logout} variant="danger" icon="log-out" />
        <Text style={[styles.footer, { color: theme.colors.muted }]}>Fleet Owner · v2.0 · Built for lorry & container owners</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  profile: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  name: { fontSize: 17, fontWeight: '800' },
  meta: { fontSize: 13, marginTop: 2 },
  label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 8 },
  options: { flexDirection: 'row', gap: 8 },
  option: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 14, borderWidth: 1.5 },
  optionText: { fontSize: 14, fontWeight: '700' },
  footer: { fontSize: 11, textAlign: 'center', marginTop: 8 },
});
