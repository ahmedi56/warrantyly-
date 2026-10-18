import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { BackHandler, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/brand-mark';
import { GoogleLogo } from '@/components/google-logo';
import { ArrowRight, ChevronLeft, CloudOff, KeyRound, Mail, ShieldCheck } from '@/components/icons';
import { PageTitle } from '@/components/page-title';
import { Button, goBack, IconButton, resetTo, T, textStyles } from '@/components/ui';
import { useStore } from '@/data/store';
import { googleEnabled, signInWithGoogle } from '@/lib/google-auth';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { requestPermission, syncReminders } from '@/notifications';
import { colors, font, radius, space } from '@/theme';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_SECONDS = 60;

// Same night palette as the welcome screen.
const NIGHT = '#0B1020';
const FIELD = '#151C33';
const FIELD_LINE = '#222B47';
const MUTED = '#9AA6C2';
const FAINT = '#6B7694';

function friendly(message: string) {
  if (/rate limit/i.test(message)) return 'Too many emails were sent. Please wait a few minutes and try again.';
  if (/expired|invalid/i.test(message)) return 'That code is wrong or has expired. Check the latest email or send a new code.';
  if (/network|fetch/i.test(message)) return 'No connection. Check your internet and try again.';
  return message;
}

export default function Login() {
  const { signIn, updateSettings, products, settings } = useStore();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!cooldown) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const backToEmail = () => {
    setStep('email');
    setCode('');
    setError('');
  };

  // On the code step, Android Back returns to the email step instead of leaving sign-in.
  useEffect(() => {
    if (Platform.OS !== 'android' || step !== 'code') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      backToEmail();
      return true;
    });
    return () => sub.remove();
  }, [step]);

  const enterApp = () => {
    // Drop Welcome/Login from history: Back on Home would otherwise land on Welcome,
    // which redirects straight back to Home (so Android Back could never exit the app).
    resetTo('/(tabs)');
    // Reminders are the core promise, so ask right away. Granting doesn't change the
    // store, so schedule explicitly instead of waiting for the next product edit.
    requestPermission()
      .then((ok) => (ok ? syncReminders(products, settings.notifications) : undefined))
      .catch(() => {});
  };

  const continueAsGuest = () => {
    updateSettings({ onboarded: true });
    enterApp();
  };

  const sendCode = async () => {
    const address = email.trim().toLowerCase();
    if (!EMAIL_RE.test(address)) return setError('Please enter a valid email address.');
    setBusy(true);
    setError('');
    const { error: err } = await supabase.auth.signInWithOtp({ email: address, options: { shouldCreateUser: true } });
    setBusy(false);
    if (err) return setError(friendly(err.message));
    setEmail(address);
    setStep('code');
    setCooldown(RESEND_SECONDS);
  };

  const google = async () => {
    setBusy(true);
    setError('');
    const res = await signInWithGoogle();
    setBusy(false);
    if (!res.ok) return res.cancelled ? undefined : setError(friendly(res.message));
    signIn(res.userId, res.email);
    enterApp();
  };

  const verify = async () => {
    const token = code.replace(/\D/g, '');
    if (token.length < 6) return setError('Enter the code from the email.');
    setBusy(true);
    setError('');
    const { data, error: err } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
    setBusy(false);
    if (err || !data.user) return setError(friendly(err?.message ?? 'Sign-in failed.'));
    signIn(data.user.id, data.user.email ?? email);
    enterApp();
  };

  if (!isSupabaseConfigured) {
    return (
      <View style={styles.root}>
        <PageTitle title="Sign in" />
        <StatusBar style="light" />
        <SafeAreaView style={styles.safe}>
          <View style={styles.topRow}>
            <IconButton icon={ChevronLeft} dark label="Back" onPress={() => goBack()} />
          </View>
          <View style={styles.body}>
            <View style={styles.offlineIcon}>
              <CloudOff size={26} color="#F5B04C" />
            </View>
            <T weight="extrabold" size={28} color={colors.white} style={styles.title}>
              Cloud sync isn’t set up
            </T>
            <T size={15} color={MUTED} style={styles.sub}>
              Your products are saved on this phone only until an account is connected.
            </T>
          </View>
          <Button label="Continue on this device" iconRight={ArrowRight} onPress={continueAsGuest} />
        </SafeAreaView>
      </View>
    );
  }

  const googleButton = (
    <Pressable
      onPress={google}
      disabled={busy || !googleEnabled}
      accessibilityRole="button"
      accessibilityLabel="Continue with Google"
      accessibilityState={{ disabled: busy || !googleEnabled }}
      style={({ pressed }) => [styles.google, !googleEnabled && styles.googleOff, pressed && googleEnabled && { opacity: 0.7 }]}>
      <GoogleLogo size={20} />
      <T weight="semibold" size={15} color={colors.text}>
        Continue with Google
      </T>
      {!googleEnabled ? (
        <View style={styles.soon}>
          <T weight="semibold" size={11} color={colors.textMuted}>
            Coming soon
          </T>
        </View>
      ) : null}
    </Pressable>
  );

  const divider = (
    <View style={styles.or}>
      <View style={styles.orLine} />
      <T size={13} color={FAINT}>
        or
      </T>
      <View style={styles.orLine} />
    </View>
  );

  return (
    <View style={styles.root}>
      <PageTitle title={step === 'email' ? 'Sign in' : 'Enter your code'} />
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.topRow}>
              <IconButton icon={ChevronLeft} dark label="Back" onPress={step === 'code' ? backToEmail : () => goBack()} />
            </View>

            <View style={styles.body}>
              <BrandMark size={52} />
              <T weight="extrabold" size={30} color={colors.white} style={styles.title}>
                {step === 'email' ? 'Welcome to Warrantyly' : 'Check your email'}
              </T>
              <T size={15} color={MUTED} style={styles.sub}>
                {step === 'email' ? 'Sign in or create an account. We’ll email you a 6-digit code, so there’s no password to remember.' : `We sent a code to ${email}`}
              </T>

              {step === 'email' ? (
                <View style={{ marginTop: space.xl }}>
                  {googleEnabled ? (
                    <>
                      {googleButton}
                      {divider}
                    </>
                  ) : null}
                  <View style={styles.input}>
                    <Mail size={18} color={FAINT} />
                    <TextInput
                      value={email}
                      onChangeText={(v) => {
                        setEmail(v);
                        setError('');
                      }}
                      placeholder="you@example.com"
                      placeholderTextColor={FAINT}
                      autoCapitalize="none"
                      autoComplete="email"
                      keyboardType="email-address"
                      textContentType="emailAddress"
                      returnKeyType="send"
                      onSubmitEditing={sendCode}
                      accessibilityLabel="Email address"
                      style={[textStyles.input, styles.field]}
                    />
                  </View>
                  <Button label="Send code" iconRight={ArrowRight} disabled={busy} onPress={sendCode} style={{ marginTop: space.lg }} />
                  {!googleEnabled ? (
                    <>
                      {divider}
                      {googleButton}
                    </>
                  ) : null}
                </View>
              ) : (
                <View style={{ marginTop: space.xl }}>
                  <View style={styles.input}>
                    <KeyRound size={18} color={FAINT} />
                    <TextInput
                      value={code}
                      onChangeText={(v) => {
                        setCode(v.replace(/\D/g, '').slice(0, 8));
                        setError('');
                      }}
                      placeholder="123456"
                      placeholderTextColor={FAINT}
                      keyboardType="number-pad"
                      autoComplete="one-time-code"
                      textContentType="oneTimeCode"
                      returnKeyType="done"
                      onSubmitEditing={verify}
                      autoFocus
                      accessibilityLabel="6-digit code"
                      style={[textStyles.input, styles.field, styles.code]}
                    />
                  </View>
                  <View style={styles.links}>
                    <Pressable onPress={backToEmail}>
                      <T weight="medium" size={14} color="#7FB0FF">
                        Change email
                      </T>
                    </Pressable>
                    <Pressable disabled={cooldown > 0 || busy} onPress={sendCode}>
                      <T weight="medium" size={14} color={cooldown > 0 ? FAINT : '#7FB0FF'}>
                        {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
                      </T>
                    </Pressable>
                  </View>
                  <Button label="Verify & continue" iconRight={ArrowRight} disabled={busy} onPress={verify} style={{ marginTop: space.lg }} />
                </View>
              )}

              {error ? (
                <T size={14} color="#FF8A93" style={{ marginTop: space.md }} accessibilityRole="alert">
                  {error}
                </T>
              ) : null}
            </View>
          </ScrollView>

          <View style={{ gap: space.xs }}>
            {step === 'email' ? (
              <Pressable onPress={continueAsGuest} accessibilityRole="button" style={styles.guest}>
                <T weight="medium" size={14} color={MUTED}>
                  Continue without an account
                </T>
              </Pressable>
            ) : null}
            <View style={styles.trust}>
              <ShieldCheck size={14} color={FAINT} />
              <T size={12} color={FAINT}>
                Your receipts stay private to your account.
              </T>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NIGHT },
  safe: { flex: 1, paddingHorizontal: space.xl, paddingBottom: space.sm },
  scroll: { flexGrow: 1 },
  topRow: { flexDirection: 'row', marginTop: space.sm },
  body: { flex: 1, paddingTop: space.xl },
  title: { marginTop: space.lg, lineHeight: 36, letterSpacing: -0.8 },
  sub: { marginTop: space.sm, lineHeight: 22 },
  offlineIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: '#2A2112', alignItems: 'center', justifyContent: 'center' },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: FIELD,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: FIELD_LINE,
    paddingHorizontal: space.lg,
  },
  field: { flex: 1, paddingVertical: 15, color: colors.white },
  code: { fontFamily: font.bold, fontSize: 24, letterSpacing: 8 },
  links: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space.lg },
  google: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 52, borderRadius: radius.lg, backgroundColor: colors.white },
  googleOff: { opacity: 0.45 },
  soon: { backgroundColor: '#E6EAF2', borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  or: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: space.md },
  orLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: FIELD_LINE },
  guest: { alignItems: 'center', paddingVertical: 10 },
  trust: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingBottom: space.xs },
});
