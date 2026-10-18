import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { AssistantMark } from '@/components/brand-mark';
import { CircleCheck, FileSearch, Loader, ShieldCheck } from '@/components/icons';
import { PageTitle } from '@/components/page-title';
import { Card, Header, Screen, T } from '@/components/ui';
import { mockExtraction } from '@/data/demo';
import { useStore } from '@/data/store';
import { partialNotice, readReceipt, type ReadResult } from '@/lib/receipt-ai';
import { colors, radius, space } from '@/theme';

const STEPS = ['Reading receipt text', 'Finding the product', 'Finding the purchase date', 'Checking the store and price', 'Preparing your details'];
const STEP_MS = 650;
/** Even a fast result waits this long, so the steps are readable instead of flashing by. */
const MIN_MS = 2200;

export default function Analyzing() {
  const { draft, setDraft } = useStore();
  const { sample } = useLocalSearchParams<{ sample?: string }>();
  const [done, setDone] = useState(0);
  const [progress] = useState(() => new Animated.Value(0));
  const [pulse] = useState(() => new Animated.Value(0));

  useEffect(() => {
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const later = (fn: () => void, ms: number) => timers.push(setTimeout(fn, ms));

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    ).start();

    // The bar stops just short of full and the last step waits, so a slow connection never looks finished too early.
    Animated.timing(progress, { toValue: 0.92, duration: STEP_MS * STEPS.length, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    STEPS.slice(0, -1).forEach((_, i) => later(() => setDone(i + 1), STEP_MS * (i + 1)));

    const receipt = draft?.receiptUri;
    // A sample receipt fills in demo details; a real photo is read by the server; no photo means nothing to read.
    const reading: Promise<ReadResult> =
      sample === '1'
        ? Promise.resolve({ ok: true, fields: mockExtraction, complete: true })
        : receipt
          ? readReceipt(receipt)
          : Promise.resolve({ ok: false, message: 'No receipt photo was added. Enter the details below.' });
    const minimum = new Promise<void>((resolve) => later(resolve, sample === '1' ? STEP_MS * STEPS.length : MIN_MS));

    Promise.all([reading, minimum]).then(([res]) => {
      if (cancelled) return;
      setDone(STEPS.length);
      Animated.timing(progress, { toValue: 1, duration: 250, useNativeDriver: false }).start();
      later(() => {
        const base = { receiptUri: draft?.receiptUri, photoUri: draft?.photoUri, reminderDays: draft?.reminderDays ?? 14 };
        setDraft(
          res.ok
            ? { ...base, ...res.fields, ...(res.complete ? {} : { notice: partialNotice }) }
            : { ...base, notice: res.message },
        );
        router.replace('/confirm');
      }, 450);
    });

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
    // Runs once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pct = Math.round((done / STEPS.length) * 100);
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });

  return (
    <Screen scroll={false}>
      <PageTitle title="Reading receipt" />
      <Header title="Reading your receipt…" subtitle="Finding the product, store, purchase date and warranty" />

      <View style={styles.art}>
        <Animated.View style={[styles.halo, { transform: [{ scale }] }]} />
        <View style={styles.doc}>
          <FileSearch size={48} color={colors.primary} strokeWidth={1.7} />
          <View style={styles.spark}>
            <AssistantMark size={34} />
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
  spark: { position: 'absolute', right: -10, bottom: -10, borderRadius: 10, borderWidth: 3, borderColor: colors.bg },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: space.lg },
  track: { flex: 1, height: 8, borderRadius: radius.pill, backgroundColor: colors.line, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.primary },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  note: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: colors.primarySoft, marginBottom: space.lg },
});
