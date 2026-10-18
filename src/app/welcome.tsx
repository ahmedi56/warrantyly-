import { Redirect, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { BrandMark } from '@/components/brand-mark';
import { Smartphone } from '@/components/icons';
import { PageTitle } from '@/components/page-title';
import { Button, T } from '@/components/ui';
import { useStore } from '@/data/store';
import { colors, space } from '@/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Example shown on the welcome ring: a phone bought in March with a 2-year warranty. */
const DAYS_LEFT = 684;
const COVER_LEFT = 0.75;

const NIGHT = '#0B1020';
const MUTED = '#9AA6C2';

/** The app's coverage ring, large: it fills once when the screen opens (skipped with reduce motion). */
function WelcomeRing({ size }: { size: number }) {
  const stroke = Math.round(size * 0.06);
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (cancelled) return;
        if (reduce) progress.setValue(COVER_LEFT);
        else Animated.timing(progress, { toValue: COVER_LEFT, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
      });
    return () => {
      cancelled = true;
    };
  }, [progress]);

  const dashOffset = progress.interpolate({ inputRange: [0, 1], outputRange: [circumference, 0] });

  return (
    <View style={{ width: size, height: size }} accessible accessibilityLabel={`Example: ${DAYS_LEFT} days of warranty cover left`}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="welcome-arc" x1="0.1" y1="0" x2="0.9" y2="1">
            <Stop offset="0" stopColor="#60A5FA" />
            <Stop offset="0.6" stopColor="#38BDF8" />
            <Stop offset="1" stopColor="#34D399" />
          </LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1A2340" strokeWidth={stroke} />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#welcome-arc)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.ringCenter}>
        <T weight="extrabold" size={Math.round(size * 0.27)} color={colors.white} style={{ lineHeight: Math.round(size * 0.3), letterSpacing: -2 }}>
          {DAYS_LEFT}
        </T>
        <T weight="medium" size={14} color={MUTED}>
          days of cover left
        </T>
      </View>
    </View>
  );
}

export default function Welcome() {
  const { settings } = useStore();
  const { height } = useWindowDimensions();
  if (settings.onboarded) return <Redirect href="/" />;

  const start = () => router.push('/login');
  const ringSize = Math.max(180, Math.min(236, Math.round(height * 0.29)));

  return (
    <View style={styles.root}>
      <PageTitle title="Welcome" />
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe}>
        <View style={styles.brand}>
          <BrandMark size={28} />
          <T weight="bold" size={16} color={colors.white}>
            Warrantyly
          </T>
        </View>

        <View style={styles.hero}>
          <WelcomeRing size={ringSize} />
          <View style={styles.chip}>
            <Smartphone size={17} color="#C9D2E8" strokeWidth={1.8} />
            <T size={13} color="#C9D2E8">
              <T weight="semibold" size={13} color={colors.white}>
                Galaxy S24
              </T>
              , bought in March
            </T>
          </View>
        </View>

        <View>
          <T weight="extrabold" size={31} color={colors.white} style={{ lineHeight: 34, letterSpacing: -0.8 }}>
            Know exactly how long you’re covered.
          </T>
          <T size={15} color={MUTED} style={{ marginTop: space.md, lineHeight: 22 }}>
            Add a product once. Warrantyly counts down its warranty and warns you before it ends.
          </T>
          <Button label="Get started" onPress={start} style={{ marginTop: space.xl }} />
          <Pressable onPress={start} accessibilityRole="button" style={styles.secondary}>
            <T weight="medium" size={14} color={MUTED}>
              I already have an account
            </T>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NIGHT },
  safe: { flex: 1, paddingHorizontal: space.xl, paddingBottom: space.md },
  brand: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.sm },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18, paddingVertical: space.lg },
  ringCenter: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#151C33',
    borderWidth: 1,
    borderColor: '#222B47',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  secondary: { alignItems: 'center', paddingVertical: 12 },
});
