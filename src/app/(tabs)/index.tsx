import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Bell, CircleAlert, Clock3, Package, Search, ShieldCheck, Sparkles } from '@/components/icons';
import { PageTitle } from '@/components/page-title';
import { HeroProductCard, ProductRow, StatTile } from '@/components/product';
import { Card, Chip, IconButton, Screen, SectionTitle, T, textStyles } from '@/components/ui';
import { useStore } from '@/data/store';
import { daysLeft, statusOf } from '@/data/warranty';
import { colors, radius, space } from '@/theme';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

const FILTERS = ['All', 'Home Appliances', 'Electronics', 'Phones', 'Computers', 'Audio'] as const;

export default function Home() {
  const { products, settings } = useStore();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');

  const counts = useMemo(() => {
    const s = products.map(statusOf);
    return {
      total: products.length,
      active: s.filter((x) => x === 'active').length,
      expiring: s.filter((x) => x === 'expiring').length,
      expired: s.filter((x) => x === 'expired').length,
    };
  }, [products]);

  const nextToExpire = useMemo(
    () =>
      products
        .filter((p) => daysLeft(p) >= 0)
        .sort((a, b) => daysLeft(a) - daysLeft(b))[0],
    [products],
  );

  const list = products.filter(
    (p) =>
      (filter === 'All' || p.category === filter) &&
      `${p.name} ${p.brand} ${p.store}`.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <Screen>
      <PageTitle title="Home" />
      <View style={styles.top}>
        <View>
          <T size={14} color={colors.textMuted}>
            {greeting()}
          </T>
          <T weight="bold" size={26} style={{ lineHeight: 32 }}>
            {settings.userName}
          </T>
        </View>
        <IconButton icon={Bell} label="Notifications" badge={counts.expiring > 0} onPress={() => router.push('/products?status=expiring')} />
      </View>

      <View style={styles.search}>
        <Search size={18} color={colors.textFaint} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search your products…"
          placeholderTextColor={colors.textFaint}
          style={[textStyles.input, { flex: 1, paddingVertical: 12 }]}
          returnKeyType="search"
        />
      </View>

      <View style={styles.grid}>
        <View style={styles.gridRow}>
          <StatTile icon={Package} value={counts.total} label="Products" fg={colors.primary} bg={colors.primarySoft} onPress={() => router.push('/products')} />
          <StatTile icon={ShieldCheck} value={counts.active} label="Active" fg={colors.success} bg={colors.successSoft} onPress={() => router.push('/products?status=active')} />
        </View>
        <View style={styles.gridRow}>
          <StatTile icon={Clock3} value={counts.expiring} label="Expiring soon" fg={colors.warning} bg={colors.warningSoft} onPress={() => router.push('/products?status=expiring')} />
          <StatTile icon={CircleAlert} value={counts.expired} label="Expired" fg={colors.danger} bg={colors.dangerSoft} onPress={() => router.push('/products?status=expired')} />
        </View>
      </View>

      {nextToExpire && !query ? (
        <>
          <SectionTitle title="Next to expire" action="See all" onAction={() => router.push('/products')} />
          <HeroProductCard product={nextToExpire} />
        </>
      ) : null}

      <Pressable onPress={() => router.push('/assistant')}>
        <Card flat style={styles.aiCard}>
          <View style={styles.aiIcon}>
            <Sparkles size={20} color={colors.violet} strokeWidth={2.2} />
          </View>
          <View style={{ flex: 1 }}>
            <T weight="semibold" size={15}>
              Something not working?
            </T>
            <T size={13} color={colors.textMuted}>
              Ask the AI assistant for quick fixes
            </T>
          </View>
        </Card>
      </Pressable>

      <SectionTitle title="My Products" />
      <View style={styles.chips}>
        {FILTERS.map((f) => (
          <Chip key={f} label={f === 'Home Appliances' ? 'Home' : f} active={filter === f} onPress={() => setFilter(f)} />
        ))}
      </View>
      <View style={{ gap: space.sm }}>
        {list.length ? (
          list.map((p) => <ProductRow key={p.id} product={p} />)
        ) : (
          <Card style={{ alignItems: 'center', paddingVertical: space.xxl }}>
            <Package size={32} color={colors.textFaint} />
            <T weight="semibold" style={{ marginTop: space.sm }}>
              No products found
            </T>
            <T size={13} color={colors.textMuted}>
              Try another search or scan a receipt.
            </T>
          </Card>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: space.sm },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingHorizontal: space.lg,
    marginTop: space.xl,
    borderWidth: 1,
    borderColor: colors.line,
  },
  grid: { gap: space.sm, marginTop: space.lg },
  gridRow: { flexDirection: 'row', gap: space.sm },
  aiCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: space.md, backgroundColor: colors.violetSoft },
  aiIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: space.md },
});
