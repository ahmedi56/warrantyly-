import { useEffect, useState } from 'react';
import { BackHandler, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ArrowRight, CloudOff, KeyRound, Mail, ShieldCheck } from '@/components/icons';
import { PageTitle } from '@/components/page-title';
import { Button, Card, Header, IconTile, resetTo, Screen, T, textStyles } from '@/components/ui';
import { useStore } from '@/data/store';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { requestPermission, syncReminders } from '@/notifications';
import { colors, font, radius, space } from '@/theme';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_SECONDS = 60;

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
      <Screen footer={<Button label="Continue on this device" iconRight={ArrowRight} onPress={continueAsGuest} />}>
        <PageTitle title="Sign in" />
        <Header title="Cloud sync not set up" subtitle="Add your Supabase key to .env to enable accounts." />
        <Card style={styles.row}>
          <IconTile icon={CloudOff} fg={colors.warning} bg={colors.warningSoft} />
          <T size={14} color={colors.textMuted} style={{ flex: 1 }}>
            Your products are saved on this phone only until an account is connected.
          </T>
        </Card>
      </Screen>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen
        footer={
          <View style={{ gap: space.sm }}>
            <Button
              label={step === 'email' ? 'Send code' : 'Verify & continue'}
              iconRight={ArrowRight}
              disabled={busy}
              onPress={step === 'email' ? sendCode : verify}
            />
            {step === 'email' ? (
              <Pressable onPress={continueAsGuest} style={{ alignItems: 'center', padding: 8 }}>
                <T weight="medium" size={14} color={colors.textMuted}>
                  Continue without an account
                </T>
              </Pressable>
            ) : null}
          </View>
        }>
        <PageTitle title={step === 'email' ? 'Sign in' : 'Enter your code'} />
        <Header
          title={step === 'email' ? 'Sign in or create account' : 'Check your email'}
          subtitle={step === 'email' ? 'We’ll email you a code — no password needed.' : `We sent a code to ${email}`}
          onBack={step === 'code' ? backToEmail : undefined}
        />

        {step === 'email' ? (
          <>
            <View style={styles.input}>
              <Mail size={18} color={colors.textFaint} />
              <TextInput
                value={email}
                onChangeText={(v) => {
                  setEmail(v);
                  setError('');
                }}
                placeholder="you@example.com"
                placeholderTextColor={colors.textFaint}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                textContentType="emailAddress"
                returnKeyType="send"
                onSubmitEditing={sendCode}
                autoFocus
                style={[textStyles.input, { flex: 1, paddingVertical: 14 }]}
              />
            </View>
            <Card style={[styles.row, { marginTop: space.xl }]}>
              <IconTile icon={ShieldCheck} fg={colors.success} bg={colors.successSoft} />
              <T size={13} color={colors.textMuted} style={{ flex: 1 }}>
                Your receipts are private and backed up securely in the EU. Only you can see them.
              </T>
            </Card>
          </>
        ) : (
          <>
            <View style={styles.input}>
              <KeyRound size={18} color={colors.textFaint} />
              <TextInput
                value={code}
                onChangeText={(v) => {
                  setCode(v.replace(/\D/g, '').slice(0, 8));
                  setError('');
                }}
                placeholder="123456"
                placeholderTextColor={colors.textFaint}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                returnKeyType="done"
                onSubmitEditing={verify}
                autoFocus
                style={[textStyles.input, styles.code]}
              />
            </View>
            <View style={styles.links}>
              <Pressable onPress={backToEmail}>
                <T weight="medium" size={14} color={colors.primary}>
                  Change email
                </T>
              </Pressable>
              <Pressable disabled={cooldown > 0 || busy} onPress={sendCode}>
                <T weight="medium" size={14} color={cooldown > 0 ? colors.textFaint : colors.primary}>
                  {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
                </T>
              </Pressable>
            </View>
          </>
        )}

        {error ? (
          <T size={14} color={colors.danger} style={{ marginTop: space.md }}>
            {error}
          </T>
        ) : null}
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: space.lg,
  },
  code: { flex: 1, paddingVertical: 14, fontFamily: font.bold, fontSize: 24, letterSpacing: 8 },
  links: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space.lg },
});
