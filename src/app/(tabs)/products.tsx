import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Package, Plus, Search } from '@/components/icons';
import { PageTitle } from '@/components/page-title';
import { ProductRow } from '@/components/product';
import { Card, Chip, IconButton, Screen, T, textStyles } from '@/components/ui';
import { useStore } from '@/data/store';
import { daysLeft, statusOf, type WarrantyStatus } from '@/data/warranty';
import { colors, radius, space } from '@/theme';

type Filter = 'all' | WarrantyStatus;
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'expiring', label: 'Expiring soon' },
  { key: 'expired', label: 'Expired' },
];

export default function Products() {
  const { products } = useStore();
  const params = useLocalSearchParams<{ status?: Filter }>();
  const [filter, setFilter] = useState<Filter>(params.status ?? 'all');
  const [query, setQuery] = useState('');

  // Follow the ?status= param when another screen links here with a new filter.
  const [lastParam, setLastParam] = useState(params.status);
  if (params.status !== lastParam) {
    setLastParam(params.status);
    if (params.status) setFilter(params.status);
  }

  const list = products
    .filter((p) => filter === 'all' || statusOf(p) === filter)
    .filter((p) => `${p.name} ${p.brand} ${p.store} ${p.category}`.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => {
      // Soonest-to-expire first, expired items last.
      const da = daysLeft(a);
      const db = daysLeft(b);
      if (da < 0 !== db < 0) return da < 0 ? 1 : -1;
      return da - db;
    });

  return (
    <Screen>
      <PageTitle title="Products" />
      <View style={styles.top}>
        <View>
          <T weight="bold" size={26} style={{ lineHeight: 32 }}>
            Products
          </T>
          <T size={14} color={colors.textMuted}>
            {products.length} items protected
          </T>
        </View>
        <IconButton icon={Plus} label="Add product" onPress={() => router.push('/scan')} />
      </View>

      <View style={styles.search}>
        <Search size={18} color={colors.textFaint} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name, brand or store"
          placeholderTextColor={colors.textFaint}
          style={[textStyles.input, { flex: 1, paddingVertical: 12 }]}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {FILTERS.map((f) => (
          <Chip key={f.key} label={f.label} active={filter === f.key} onPress={() => setFilter(f.key)} />
        ))}
      </ScrollView>

      <View style={{ gap: space.sm }}>
        {list.length ? (
          list.map((p) => <ProductRow key={p.id} product={p} />)
        ) : (
          <Card style={{ alignItems: 'center', paddingVertical: space.xxl }}>
            <Package size={32} color={colors.textFaint} />
            <T weight="semibold" style={{ marginTop: space.sm }}>
              Nothing here yet
            </T>
            <T size={13} color={colors.textMuted}>
              Scan a receipt to add your first product.
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
  chips: { gap: 8, paddingVertical: space.md },
});
