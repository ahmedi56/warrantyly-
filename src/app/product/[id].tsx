import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SelectField } from '@/components/fields';
import {
  Bell,
  BookOpen,
  CalendarCheck,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  Hash,
  MessageCircle,
  Store,
  Trash2,
  Wallet,
  Wrench,
  type LucideIcon,
} from '@/components/icons';
import { PageTitle } from '@/components/page-title';
import { CoverageRing, categoryIcon } from '@/components/product';
import { Badge, Button, Card, Divider, goBack, IconButton, IconTile, T } from '@/components/ui';
import { guides } from '@/data/guides';
import { nextReminderFor } from '@/data/reminders';
import { useProduct, useStore } from '@/data/store';
import { daysLeft, expiryDate, formatDate, formatPrice, formatWarranty, humanizeDays, statusOf, statusStyle } from '@/data/warranty';
import { colors, radius, space } from '@/theme';

const TABS = ['Overview', 'Guides', 'Support', 'Files'] as const;
type Tab = (typeof TABS)[number];

function InfoRow({ icon, label, value, accent }: { icon: LucideIcon; label: string; value: string; accent?: string }) {
  return (
    <View style={styles.info}>
      <IconTile icon={icon} size={38} fg={colors.textMuted} bg={colors.cardAlt} />
      <View style={{ flex: 1 }}>
        <T size={12} color={colors.textFaint}>
          {label}
        </T>
        <T weight="semibold" size={15}>
          {value}
          {accent ? <T weight="medium" size={13} color={colors.success}>{`  ${accent}`}</T> : null}
        </T>
      </View>
    </View>
  );
}

export default function ProductDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const product = useProduct(id);
  const { deleteProduct, updateProduct, settings } = useStore();
  const [tab, setTab] = useState<Tab>('Overview');
  const insets = useSafeAreaInsets();

  if (!product) return <Redirect href="/(tabs)/products" />;

  const st = statusOf(product);
  const d = daysLeft(product);
  const Icon = categoryIcon[product.category];
  const next = nextReminderFor(product);
  const reminderNote = !settings.notifications
    ? 'Reminders are turned off in Profile.'
    : next
      ? `Next reminder: ${formatDate(next.date)} at 9:00`
      : 'No upcoming reminders — this warranty has ended.';

  const remove = () => {
    const doIt = () => {
      goBack('/(tabs)/products');
      deleteProduct(product.id);
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`Delete ${product.name}?`)) doIt();
    } else {
      Alert.alert('Delete product?', `${product.name} and its claims will be removed.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doIt },
      ]);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <PageTitle title={product.name} />
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { paddingTop: insets.top + 8 }]}>
          {product.photoUri ? (
            <Image source={{ uri: product.photoUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <LinearGradient colors={['#E4ECFF', '#F4F6FB']} style={StyleSheet.absoluteFill} />
          )}
          <View style={styles.heroBar}>
            <IconButton icon={ChevronLeft} label="Back" onPress={() => goBack('/(tabs)/products')} />
            <IconButton icon={Trash2} label="Delete product" onPress={remove} />
          </View>
          {!product.photoUri ? (
            <View style={styles.heroIcon}>
              <Icon size={84} color={colors.text} strokeWidth={1.2} />
            </View>
          ) : null}
        </View>

        <View style={styles.sheet}>
          <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <T weight="bold" size={24} style={{ lineHeight: 30 }}>
                {product.name}
              </T>
              <T color={colors.textMuted}>
                {product.brand} · {product.category}
              </T>
            </View>
            <CoverageRing product={product} size={60} />
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: space.md }}>
            <Badge label={statusStyle[st].label} fg={statusStyle[st].fg} bg={statusStyle[st].bg} />
            <Badge label={`${formatWarranty(product.warrantyMonths)} warranty`} icon={Clock3} fg={colors.primary} bg={colors.primarySoft} />
          </View>

          <View style={styles.tabs}>
            {TABS.map((t) => (
              <Pressable key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabActive]}>
                <T weight={tab === t ? 'semibold' : 'medium'} size={14} color={tab === t ? colors.primary : colors.textMuted}>
                  {t}
                </T>
              </Pressable>
            ))}
          </View>

          {tab === 'Overview' ? (
            <Card style={{ gap: 2 }}>
              <InfoRow icon={CalendarCheck} label="Purchase date" value={formatDate(product.purchaseDate)} />
              <Divider style={{ marginLeft: 50 }} />
              <InfoRow icon={CalendarClock} label="Expiration date" value={formatDate(expiryDate(product))} accent={`(${humanizeDays(d).replace('Expires ', '')})`} />
              <Divider style={{ marginLeft: 50 }} />
              <InfoRow icon={Store} label="Store" value={product.store} />
              <Divider style={{ marginLeft: 50 }} />
              <InfoRow icon={Wallet} label="Price" value={formatPrice(product)} />
              {product.serial ? (
                <>
                  <Divider style={{ marginLeft: 50 }} />
                  <InfoRow icon={Hash} label="Serial number" value={product.serial} />
                </>
              ) : null}
              <Divider style={{ marginLeft: 50 }} />
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', paddingTop: 10 }}>
                <IconTile icon={Bell} size={38} fg={colors.textMuted} bg={colors.cardAlt} />
                <View style={{ flex: 1 }}>
                  <SelectField<number>
                    label="Remind me"
                    value={product.reminderDays}
                    onChange={(reminderDays) => updateProduct(product.id, { reminderDays })}
                    options={[60, 30, 14, 7, 1].map((n) => ({ label: `${n} day${n === 1 ? '' : 's'} before expiry`, value: n }))}
                  />
                  <T size={12} color={colors.textMuted} style={{ marginTop: -6 }}>
                    {reminderNote}
                  </T>
                </View>
              </View>
            </Card>
          ) : null}

          {tab === 'Guides' ? (
            <View style={{ gap: space.sm }}>
              {guides.map((g) => (
                <Card key={g.id} onPress={() => router.push(`/guides?open=${g.id}`)} style={styles.listRow}>
                  <IconTile icon={BookOpen} />
                  <View style={{ flex: 1 }}>
                    <T weight="semibold">{g.title}</T>
                    <T size={12} color={colors.textMuted}>
                      {g.topic} · {g.minutes} min
                    </T>
                  </View>
                  <ChevronRight size={18} color={colors.textFaint} />
                </Card>
              ))}
            </View>
          ) : null}

          {tab === 'Support' ? (
            <View style={{ gap: space.sm }}>
              <Card onPress={() => router.push(`/claim/${product.id}`)} style={styles.listRow}>
                <IconTile icon={Wrench} fg={colors.danger} bg={colors.dangerSoft} />
                <View style={{ flex: 1 }}>
                  <T weight="semibold">Start a warranty claim</T>
                  <T size={12} color={colors.textMuted}>
                    We prepare everything the store needs
                  </T>
                </View>
                <ChevronRight size={18} color={colors.textFaint} />
              </Card>
              <Card onPress={() => router.push('/assistant')} style={styles.listRow}>
                <IconTile icon={MessageCircle} fg={colors.violet} bg={colors.violetSoft} />
                <View style={{ flex: 1 }}>
                  <T weight="semibold">Ask AI Support</T>
                  <T size={12} color={colors.textMuted}>
                    Troubleshoot before you claim
                  </T>
                </View>
                <ChevronRight size={18} color={colors.textFaint} />
              </Card>
            </View>
          ) : null}

          {tab === 'Files' ? (
            <View style={styles.files}>
              <View style={styles.file}>
                {product.receiptUri ? (
                  <Image source={{ uri: product.receiptUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
                ) : (
                  <FileText size={30} color={colors.textFaint} />
                )}
                <View style={styles.fileLabel}>
                  <T weight="medium" size={12}>
                    Receipt
                  </T>
                </View>
              </View>
              <View style={[styles.file, { borderStyle: 'dashed' }]}>
                <T size={12} color={colors.textMuted} style={{ textAlign: 'center' }}>
                  Warranty card{'\n'}coming soon
                </T>
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View style={[styles.actions, { paddingBottom: insets.bottom + space.md }]}>
        <Button label="Something broke?" icon={Wrench} variant="secondary" compact style={{ flex: 1.45 }} onPress={() => router.push(`/claim/${product.id}`)} />
        <Button label="Guides" icon={BookOpen} compact style={{ flex: 1 }} onPress={() => setTab('Guides')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { height: 300, overflow: 'hidden' },
  heroBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: space.xl },
  heroIcon: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 30 },
  sheet: { marginTop: -32, backgroundColor: colors.bg, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: space.xl },
  tabs: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: radius.md, padding: 4, marginVertical: space.xl, borderWidth: 1, borderColor: colors.line },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 10 },
  tabActive: { backgroundColor: colors.primarySoft },
  info: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  files: { flexDirection: 'row', gap: space.md },
  file: { flex: 1, height: 150, borderRadius: radius.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  fileLabel: { position: 'absolute', left: 8, bottom: 8, backgroundColor: colors.card, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  actions: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: space.sm, paddingHorizontal: space.xl, paddingTop: space.md, backgroundColor: colors.bg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
});
