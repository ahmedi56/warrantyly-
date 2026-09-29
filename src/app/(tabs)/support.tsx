import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { BookOpen, ChevronRight, FileText, MessageCircle, Wrench } from '@/components/icons';
import { PageTitle } from '@/components/page-title';
import { CoverageRing } from '@/components/product';
import { Badge, Card, IconTile, Screen, SectionTitle, T } from '@/components/ui';
import { useStore } from '@/data/store';
import { formatDate } from '@/data/warranty';
import { colors, space } from '@/theme';

export default function Support() {
  const { products, claims } = useStore();

  const actions = [
    { icon: Wrench, title: 'Something broke?', sub: 'Check coverage and start a claim', fg: colors.danger, bg: colors.dangerSoft, go: () => router.push('/products') },
    { icon: MessageCircle, title: 'Ask AI Support', sub: 'Instant help for your product', fg: colors.violet, bg: colors.violetSoft, go: () => router.push('/assistant') },
    { icon: BookOpen, title: 'Guides & Tutorials', sub: 'Maintenance and troubleshooting', fg: colors.primary, bg: colors.primarySoft, go: () => router.push('/guides') },
  ];

  return (
    <Screen>
      <PageTitle title="Support" />
      <T weight="bold" size={26} style={{ marginTop: space.sm, lineHeight: 32 }}>
        Support
      </T>
      <T size={14} color={colors.textMuted}>
        Get your products fixed, fast.
      </T>

      <View style={{ gap: space.sm, marginTop: space.xl }}>
        {actions.map((a) => (
          <Card key={a.title} onPress={a.go} style={styles.row}>
            <IconTile icon={a.icon} fg={a.fg} bg={a.bg} />
            <View style={{ flex: 1 }}>
              <T weight="semibold">{a.title}</T>
              <T size={13} color={colors.textMuted}>
                {a.sub}
              </T>
            </View>
            <ChevronRight size={18} color={colors.textFaint} />
          </Card>
        ))}
      </View>

      <SectionTitle title="Your claims" />
      {claims.length ? (
        <View style={{ gap: space.sm }}>
          {claims.map((c) => {
            const p = products.find((x) => x.id === c.productId);
            if (!p) return null;
            return (
              <Card key={c.id} onPress={() => router.push(`/claim/${p.id}?claim=${c.id}`)} style={styles.row}>
                <CoverageRing product={p} size={48} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <T weight="semibold" numberOfLines={1}>
                    {p.name}
                  </T>
                  <T size={13} color={colors.textMuted} numberOfLines={1}>
                    {c.issue}
                  </T>
                  <T size={12} color={colors.textFaint}>
                    {formatDate(new Date(c.createdAt))}
                  </T>
                </View>
                <Badge label="Ready" fg={colors.primary} bg={colors.primarySoft} />
              </Card>
            );
          })}
        </View>
      ) : (
        <Card style={{ alignItems: 'center', paddingVertical: space.xl }}>
          <FileText size={28} color={colors.textFaint} />
          <T weight="semibold" style={{ marginTop: space.sm }}>
            No claims yet
          </T>
          <T size={13} color={colors.textMuted} style={{ textAlign: 'center' }}>
            Open a product and tap “Something broke?”{'\n'}to prepare one in under a minute.
          </T>
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
});
