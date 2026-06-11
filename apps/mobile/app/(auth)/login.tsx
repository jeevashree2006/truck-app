import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usingMocks } from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { useT } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_RE = /^\+?\d{7,15}$/;
const isValidIdentifier = (v: string) => EMAIL_RE.test(v.trim()) || MOBILE_RE.test(v.trim().replace(/[\s-]/g, ''));

export default function LoginScreen() {
  const { theme } = useTheme();
  const t = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { requestOtp } = useAuth();

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const valid = isValidIdentifier(email);

  const onContinue = async () => {
    if (!valid) {
      setError('Enter a valid mobile number or email');
      return;
    }
    setError(undefined);
    setLoading(true);
    try {
      const res = await requestOtp(email.trim(), name.trim() || undefined);
      router.push({
        pathname: '/(auth)/verify',
        params: { email: email.trim(), devCode: res.dev_code ?? '' },
      });
    } catch {
      setError('Could not send code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <LinearGradient
        colors={[theme.brandGradient[0], theme.brandGradient[1]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: insets.top + 40 }]}
      >
        <Animated.View entering={FadeInUp.springify().damping(16)} style={styles.logoWrap}>
          <View style={styles.logoBadge}>
            <Ionicons name="cube" size={34} color="#fff" />
          </View>
          <Text style={styles.brand}>{t('common.appName')}</Text>
          <Text style={styles.tagline}>{t('auth.tagline')}</Text>
        </Animated.View>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.delay(120).springify().damping(18)}>
            <Text style={[styles.welcome, { color: theme.colors.text }]}>
              {t('auth.welcome')}
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
              {t('auth.tagline')}
            </Text>

            <View style={styles.fields}>
              <TextField
                label={t('auth.emailLabel')}
                value={email}
                onChangeText={(v) => {
                  setEmail(v);
                  if (error) setError(undefined);
                }}
                placeholder={t('auth.emailPlaceholder')}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                icon="mail"
                error={error}
                returnKeyType="next"
              />
              <TextField
                label={t('auth.nameLabel')}
                value={name}
                onChangeText={setName}
                placeholder={t('auth.namePlaceholder')}
                autoCapitalize="words"
                autoComplete="name"
                icon="person"
                optional
                returnKeyType="go"
                onSubmitEditing={onContinue}
              />
            </View>

            <Button
              title={loading ? t('auth.sendingCode') : t('auth.continue')}
              onPress={onContinue}
              loading={loading}
              disabled={!valid}
              icon="arrow-forward"
            />

            {usingMocks && (
              <View style={[styles.mockHint, { borderColor: theme.colors.border }]}>
                <Ionicons name="flask" size={14} color={theme.colors.accent} />
                <Text style={[styles.mockText, { color: theme.colors.muted }]}>
                  Demo mode — any email works, code is 123456
                </Text>
              </View>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: {
    paddingBottom: 48,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    alignItems: 'center',
  },
  logoWrap: { alignItems: 'center' },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  brand: { color: '#fff', fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  tagline: { color: 'rgba(255,255,255,0.85)', fontSize: 14, marginTop: 6, textAlign: 'center' },
  form: { paddingHorizontal: 24, paddingTop: 32 },
  welcome: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: 15, marginTop: 6, lineHeight: 21 },
  fields: { marginTop: 28 },
  mockHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    padding: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  mockText: { fontSize: 13, flex: 1 },
});
