import { usePathname } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { House, SearchX } from '@/components/icons';
import { PageTitle } from '@/components/page-title';
import { Button, resetTo, Screen, T } from '@/components/ui';
import { colors, radius, space } from '@/theme';

/** Shown for unknown URLs and deep links; exported as 404.html for web hosts. */
export default function NotFound() {
  const pathname = usePathname();
  return (
    <Screen scroll={false} contentStyle={styles.center}>
      <PageTitle title="Page not found" />
      <View style={styles.icon}>
        <SearchX size={36} color={colors.primary} strokeWidth={1.8} />
      </View>
      <T weight="bold" size={24} style={{ marginTop: space.lg, textAlign: 'center' }}>
        Page not found
      </T>
      <T size={15} color={colors.textMuted} style={{ marginTop: space.sm, textAlign: 'center' }}>
        We couldn’t find {pathname && pathname !== '/' ? `“${pathname}”` : 'that page'}. It may have moved or the link is wrong.
      </T>
      {/* `/` is Home, which sends anyone who hasn't onboarded to Welcome. */}
      <Button label="Go to Home" icon={House} style={{ marginTop: space.xl, alignSelf: 'stretch' }} onPress={() => resetTo('/')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: 'center', alignItems: 'center', paddingBottom: space.xxl },
  icon: { width: 80, height: 80, borderRadius: radius.xl, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
});
