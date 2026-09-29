import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router, Tabs } from 'expo-router';
import { Pressable, StyleSheet, View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { House, LifeBuoy, Package, ScanLine, UserRound, type LucideIcon } from '@/components/icons';
import { T, tap } from '@/components/ui';
import { useStore } from '@/data/store';
import { colors, font, gradients } from '@/theme';

function tabIcon(Icon: LucideIcon) {
  return function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    return <Icon size={22} color={color as string} strokeWidth={focused ? 2.4 : 1.9} />;
  };
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { settings } = useStore();
  // `/` is Home; first-time visitors (and anyone who logged out) start at Welcome.
  if (!settings.onboarded) return <Redirect href="/welcome" />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarLabelStyle: { fontFamily: font.medium, fontSize: 11 },
        tabBarStyle: [styles.bar, { height: 64 + insets.bottom, paddingBottom: insets.bottom + 6 }],
      }}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: tabIcon(House) }} />
      <Tabs.Screen name="products" options={{ title: 'Products', tabBarIcon: tabIcon(Package) }} />
      <Tabs.Screen
        name="add"
        options={{
          title: 'Scan',
          tabBarButton: () => (
            <View style={styles.scanSlot}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Scan a receipt"
                onPress={() => {
                  tap();
                  router.push('/scan');
                }}
                style={({ pressed }) => [styles.scanBtn, pressed && { transform: [{ scale: 0.94 }] }]}>
                <LinearGradient colors={gradients.primary} style={styles.scanInner}>
                  <ScanLine size={26} color={colors.white} strokeWidth={2.2} />
                </LinearGradient>
              </Pressable>
              <T weight="medium" size={11} color={colors.textFaint} style={{ marginTop: 2 }}>
                Scan
              </T>
            </View>
          ),
        }}
      />
      <Tabs.Screen name="support" options={{ title: 'Support', tabBarIcon: tabIcon(LifeBuoy) }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: tabIcon(UserRound) }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.card,
    borderTopColor: colors.line,
    paddingTop: 8,
  },
  scanSlot: { flex: 1, alignItems: 'center', justifyContent: 'flex-start' },
  scanBtn: {
    marginTop: -26,
    borderRadius: 22,
    padding: 5,
    backgroundColor: colors.bg,
  },
  scanInner: {
    width: 56,
    height: 56,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 6px 12px rgba(37, 99, 235, 0.35)',
  },
});
