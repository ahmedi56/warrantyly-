import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import {
  ChevronRight,
  Headphones,
  Laptop,
  Package,
  Refrigerator,
  Smartphone,
  Sofa,
  Tv,
  Wrench,
  type LucideIcon,
} from '@/components/icons';
import { Card, T } from '@/components/ui';
import type { Category, Product } from '@/data/types';
import { coverageLeft, daysLeft, expiryDate as expiryOf, formatDate, humanizeDays, statusOf, statusStyle } from '@/data/warranty';
import { colors, radius } from '@/theme';

export const categoryIcon: Record<Category, LucideIcon> = {
  'Home Appliances': Refrigerator,
  Electronics: Tv,
  Computers: Laptop,
  Phones: Smartphone,
  Audio: Headphones,
  Furniture: Sofa,
  Tools: Wrench,
  Other: Package,
};

/**
 * Signature element: a ring showing how much warranty coverage is left,
 * with the product photo (or category icon) inside.
 */
export function CoverageRing({ product, size = 64, stroke = 4 }: { product: Product; size?: number; stroke?: number }) {
  const st = statusOf(product);
  const pct = st === 'expired' ? 0 : coverageLeft(product);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const inner = size - stroke * 2 - 6;
  const Icon = categoryIcon[product.category];

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.line} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={statusStyle[st].fg}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={c * (1 - Math.max(pct, 0.02))}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View
        style={{
          width: inner,
          height: inner,
          borderRadius: inner / 2,
          backgroundColor: colors.cardAlt,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}>
        {product.photoUri ? (
          <Image source={{ uri: product.photoUri }} style={{ width: inner, height: inner }} contentFit="cover" />
        ) : (
          <Icon size={inner * 0.45} color={colors.text} strokeWidth={1.8} />
        )}
      </View>
    </View>
  );
}

export function ProductRow({ product }: { product: Product }) {
  const st = statusOf(product);
  const d = daysLeft(product);
  return (
    <Card onPress={() => router.push(`/product/${product.id}`)} style={styles.row}>
      <CoverageRing product={product} size={58} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <T weight="semibold" size={15} numberOfLines={1}>
          {product.name}
        </T>
        <T size={13} color={colors.textMuted} numberOfLines={1}>
          {product.brand} · {product.category}
        </T>
        <T weight="medium" size={12} color={statusStyle[st].fg} style={{ marginTop: 3 }}>
          {humanizeDays(d)}
        </T>
      </View>
      <ChevronRight size={18} color={colors.textFaint} />
    </Card>
  );
}

/** Large "expiring soon" card for the home screen. */
export function HeroProductCard({ product }: { product: Product }) {
  const st = statusOf(product);
  const d = daysLeft(product);
  return (
    <Card onPress={() => router.push(`/product/${product.id}`)} style={styles.hero}>
      <CoverageRing product={product} size={84} stroke={5} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <T weight="bold" size={17} numberOfLines={1}>
          {product.name}
        </T>
        <T size={13} color={colors.textMuted}>
          {product.brand} · {product.category}
        </T>
        <View style={[styles.expiryPill, { backgroundColor: statusStyle[st].bg }]}>
          <T weight="semibold" size={12} color={statusStyle[st].fg} style={{ lineHeight: 16 }}>
            {humanizeDays(d)}
          </T>
        </View>
        <T size={12} color={colors.textFaint} style={{ marginTop: 4 }}>
          Until {formatDate(expiryOf(product))}
        </T>
      </View>
      <ChevronRight size={20} color={colors.textFaint} />
    </Card>
  );
}

export function StatTile({
  icon: Icon,
  value,
  label,
  fg,
  bg,
  onPress,
}: {
  icon: LucideIcon;
  value: number | string;
  label: string;
  fg: string;
  bg: string;
  onPress?: () => void;
}) {
  return (
    <Card onPress={onPress} style={styles.stat}>
      <View style={[styles.statIcon, { backgroundColor: bg }]}>
        <Icon size={20} color={fg} strokeWidth={2.2} />
      </View>
      <View>
        <T weight="bold" size={22} style={{ lineHeight: 26 }}>
          {value}
        </T>
        <T size={12} color={colors.textMuted}>
          {label}
        </T>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, borderRadius: radius.lg },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  expiryPill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, marginTop: 8 },
  stat: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.lg },
  statIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
});
