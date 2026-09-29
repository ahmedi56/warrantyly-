import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { CircleCheck, FileSearch, Loader, ShieldCheck, Sparkles } from '@/components/icons';
import { PageTitle } from '@/components/page-title';
import { Card, Header, Screen, T } from '@/components/ui';
import { mockExtraction } from '@/data/demo';
import { useStore } from '@/data/store';
import { colors, radius, space } from '@/theme';

const STEPS = ['Reading receipt text', 'Detecting product details', 'Finding purchase date', 'Calculating warranty period', 'Searching product information'];
const STEP_MS = 650;

export default function Analyzing() {
  const { draft, setDraft } = useStore();
  const [done, setDone] = useState(0);
  const [progress] = useState(() => new Animated.Value(0));
  const [pulse] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    ).start();

    Animated.timing(progress, { toValue: 1, duration: STEP_MS * STEPS.length, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();

    const timers = STEPS.map((_, i) => setTimeout(() => setDone(i + 1), STEP_MS * (i + 1)));
    // Simulated AI extraction. Replace with a call to your backend (e.g. a Supabase Edge Function).
    const finish = setTimeout(() => {
      setDraft({ ...mockExtraction, ...draft, reminderDays: draft?.reminderDays ?? 14 });
      router.replace('/confirm');
    }, STEP_MS * STEPS.length + 400);

    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(finish);
    };
    // Runs once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pct = Math.round((done / STEPS.length) * 100);
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });

  return (
    <Screen scroll={false}>
      <PageTitle title="Reading receipt" />
      <Header title="AI is analyzing…" subtitle="Extracting product information from your receipt" />

      <View style={styles.art}>
        <Animated.View style={[styles.halo, { transform: [{ scale }] }]} />
        <View style={styles.doc}>
          <FileSearch size={48} color={colors.primary} strokeWidth={1.7} />
          <View style={styles.spark}>
            <Sparkles size={16} color={colors.white} />
          </View>
        </View>
      </View>

      <View style={styles.barRow}>
        <View style={styles.track}>
          <Animated.View style={[styles.fill, { width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
        </View>
        <T weight="semibold" size={14} style={{ width: 44, textAlign: 'right' }}>
          {pct}%
        </T>
      </View>

      <View style={{ gap: 14, marginTop: space.xl }}>
        {STEPS.map((s, i) => {
          const complete = i < done;
          const active = i === done;
          return (
            <View key={s} style={styles.step}>
              {complete ? (
                <CircleCheck size={20} color={colors.success} fill={colors.successSoft} />
              ) : (
                <Loader size={20} color={active ? colors.primary : colors.textFaint} />
              )}
              <T weight={complete ? 'medium' : 'regular'} color={complete ? colors.text : colors.textMuted}>
                {s}
              </T>
            </View>
          );
        })}
      </View>

      <View style={{ flex: 1 }} />
      <Card flat style={styles.note}>
        <ShieldCheck size={20} color={colors.primary} />
        <T size={13} color={colors.textMuted} style={{ flex: 1 }}>
          This usually takes a few seconds. You can review and edit everything before saving.
        </T>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  art: { height: 190, alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', width: 170, height: 170, borderRadius: 85, backgroundColor: colors.primarySoft },
  doc: { width: 110, height: 110, borderRadius: 32, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(37, 99, 235, 0.2)' },
  spark: { position: 'absolute', right: -6, bottom: -6, width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.bg },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: space.lg },
  track: { flex: 1, height: 8, borderRadius: radius.pill, backgroundColor: colors.line, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.primary },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  note: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: colors.primarySoft, marginBottom: space.lg },
});
