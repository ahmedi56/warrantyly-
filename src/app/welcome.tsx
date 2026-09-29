import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ArrowRight, BellRing, Headphones, Laptop, Refrigerator, ScanLine, ShieldCheck, Smartphone, Wrench, type LucideIcon } from '@/components/icons';
import { PageTitle } from '@/components/page-title';
import { Button, T } from '@/components/ui';
import { useStore } from '@/data/store';
import { colors, gradients, radius, space } from '@/theme';

const features: { icon: LucideIcon; label: string; tint: string }[] = [
  { icon: ScanLine, label: 'Scan receipts with AI', tint: '#60A5FA' },
  { icon: BellRing, label: 'Get reminded before it expires', tint: '#A78BFA' },
  { icon: Wrench, label: 'Repair help & claim support', tint: '#FBBF24' },
];

/** Orbit of product tiles around the shield — replaces the 3D render with crisp vector icons. */
const orbit: { icon: LucideIcon; top: number; left: number; rotate: string }[] = [
  { icon: Laptop, top: 8, left: 190, rotate: '10deg' },
  { icon: Refrigerator, top: 30, left: 30, rotate: '-8deg' },
  { icon: Headphones, top: 150, left: 0, rotate: '6deg' },
  { icon: Smartphone, top: 160, left: 214, rotate: '-10deg' },
];

export default function Welcome() {
  const { settings } = useStore();
  if (settings.onboarded) return <Redirect href="/" />;

  const start = () => router.push('/login');

  return (
    <LinearGradient colors={gradients.night} style={{ flex: 1 }} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 1 }}>
      <PageTitle title="Welcome" />
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe}>
        <View style={styles.art}>
          <View style={styles.glow} />
          {orbit.map(({ icon: Icon, top, left, rotate }, i) => (
            <View key={i} style={[styles.tile, { top, left, transform: [{ rotate }] }]}>
              <Icon size={30} color="#DCE6FF" strokeWidth={1.6} />
            </View>
          ))}
          <LinearGradient colors={gradients.primary} style={styles.shield}>
            <ShieldCheck size={52} color={colors.white} strokeWidth={2} />
          </LinearGradient>
        </View>

        <View style={{ alignItems: 'center' }}>
          <T weight="extrabold" size={36} color={colors.white} style={{ lineHeight: 42, letterSpacing: -0.5 }}>
            Warrantyly
          </T>
          <T size={16} color="#B8C3E0" style={{ textAlign: 'center', marginTop: 6 }}>
            All your product warranties{'\n'}in one place
          </T>
        </View>

        <View style={styles.features}>
          {features.map(({ icon: Icon, label, tint }) => (
            <View key={label} style={styles.feature}>
              <View style={[styles.featureIcon, { backgroundColor: tint + '26' }]}>
                <Icon size={18} color={tint} strokeWidth={2.2} />
              </View>
              <T weight="medium" size={15} color="#E6ECFA">
                {label}
              </T>
            </View>
          ))}
        </View>

        <View style={{ gap: space.md }}>
          <Button label="Get Started" iconRight={ArrowRight} onPress={start} />
          <Pressable onPress={start} style={{ alignItems: 'center', padding: 8 }}>
            <T weight="medium" size={14} color="#B8C3E0">
              I already have an account
            </T>
          </Pressable>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: space.xl, paddingBottom: space.lg, justifyContent: 'space-between' },
  art: { width: 280, height: 250, alignSelf: 'center', marginTop: space.xl, alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(59,130,246,0.22)' },
  tile: {
    position: 'absolute',
    width: 66,
    height: 66,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shield: {
    width: 104,
    height: 104,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 10px 30px rgba(59, 130, 246, 0.6)',
  },
  features: {
    gap: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: radius.xl,
    padding: space.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
});
