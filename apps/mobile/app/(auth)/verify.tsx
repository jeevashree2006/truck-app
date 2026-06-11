import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/AuthProvider';
import { Button } from '@/components/Button';
import { SegmentedOtpInput } from '@/components/SegmentedOtpInput';
import { useT } from '@/i18n';
import { tint } from '@/theme/theme';
import { useTheme } from '@/theme/ThemeProvider';

const CODE_LENGTH = 6;

export default function VerifyScreen() {
  const { theme } = useTheme();
  const t = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { verifyOtp, requestOtp } = useAuth();
  const params = useLocalSearchParams<{ email: string; devCode?: string }>();
  const email = params.email ?? '';

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const submit = async (value: string) => {
    if (value.length !== CODE_LENGTH || loading) return;
    setLoading(true);
    setError(false);
    try {
      await verifyOtp(email, value);
      router.replace('/(tabs)');
    } catch {
      setError(true);
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setCode('');
    setError(false);
    try {
      await requestOtp(email);
    } catch {
      /* ignore — UI already shows the field */
    }
  };

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <LinearGradient
        colors={[theme.brandGradient[0], theme.brandGradient[1]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: insets.top + 12 }]}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </Pressable>
        <Animated.View entering={FadeInUp.springify().damping(16)} style={styles.heroBody}>
          <View style={styles.iconBadge}>
            <Ionicons name="shield-checkmark" size={30} color="#fff" />
          </View>
          <Text style={styles.title}>{t('auth.verifyTitle')}</Text>
          <Text style={styles.subtitle}>{t('auth.verifySubtitle', { email })}</Text>
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
            <SegmentedOtpInput
              length={CODE_LENGTH}
              value={code}
              onChange={(v) => {
                setCode(v);
                if (error) setError(false);
              }}
              onComplete={submit}
              error={error}
            />

            {error && (
              <Text style={[styles.error, { color: theme.colors.expired }]}>
                {t('auth.invalidCode')}
              </Text>
            )}

            {params.devCode ? (
              <View style={[styles.devHint, { backgroundColor: tint(theme.colors.accent, 0.12) }]}>
                <Ionicons name="key" size={14} color={theme.colors.accent} />
                <Text style={[styles.devText, { color: theme.colors.accent }]}>
                  {t('auth.devCodeHint', { code: params.devCode })}
                </Text>
              </View>
            ) : null}

            <View style={styles.cta}>
              <Button
                title={loading ? t('auth.verifying') : t('auth.verify')}
                onPress={() => submit(code)}
                loading={loading}
                disabled={code.length !== CODE_LENGTH}
                icon="checkmark"
              />
            </View>

            <Pressable onPress={resend} style={styles.resend} accessibilityRole="button">
              <Ionicons name="refresh" size={16} color={theme.colors.primary} />
              <Text style={[styles.resendText, { color: theme.colors.primary }]}>
                {t('auth.resend')}
              </Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: {
    paddingBottom: 40,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBody: { alignItems: 'center', marginTop: 16 },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: { color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center' },
  subtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
  },
  form: { paddingHorizontal: 24, paddingTop: 36 },
  error: { fontSize: 13, marginTop: 12, textAlign: 'center', fontWeight: '600' },
  devHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'center',
    marginTop: 18,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  devText: { fontSize: 13, fontWeight: '700' },
  cta: { marginTop: 28 },
  resend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    marginTop: 20,
    padding: 8,
  },
  resendText: { fontSize: 15, fontWeight: '700' },
});
