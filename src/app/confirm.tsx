import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Field, SelectField } from '@/components/fields';
import { ArrowRight, Calendar, ImagePlus, Sparkles } from '@/components/icons';
import { PageTitle } from '@/components/page-title';
import { categoryIcon } from '@/components/product';
import { Badge, Button, Card, Header, resetTo, Screen, T } from '@/components/ui';
import { useStore } from '@/data/store';
import { CATEGORIES, type Category } from '@/data/types';
import { expiryDate, formatDate, toISO } from '@/data/warranty';
import { colors, radius, space } from '@/theme';

const WARRANTY_OPTIONS = [6, 12, 18, 24, 36, 48, 60].map((m) => ({
  label: m % 12 === 0 ? `${m / 12} Year${m === 12 ? '' : 's'}` : `${m} Months`,
  value: m,
}));

const isValidISO = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(s).getTime());

function warn(msg: string) {
  if (Platform.OS === 'web') window.alert(msg);
  else Alert.alert('Check the details', msg);
}

export default function Confirm() {
  const { draft, addProduct, setDraft, settings } = useStore();
  const [name, setName] = useState(draft?.name ?? '');
  const [brand, setBrand] = useState(draft?.brand ?? '');
  const [store, setStore] = useState(draft?.store ?? '');
  const [category, setCategory] = useState<Category>(draft?.category ?? 'Other');
  const [purchaseDate, setPurchaseDate] = useState(draft?.purchaseDate ?? toISO(new Date()));
  const [months, setMonths] = useState(draft?.warrantyMonths ?? 24);
  const [price, setPrice] = useState(draft?.price != null ? String(draft.price) : '');
  const [photoUri, setPhotoUri] = useState(draft?.photoUri);

  if (!draft) return <Redirect href="/(tabs)" />;

  const fromAI = draft.name != null;
  const CatIcon = categoryIcon[category];

  const changePhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, allowsEditing: true, aspect: [4, 3] });
    if (!res.canceled) setPhotoUri(res.assets[0].uri);
  };

  const save = () => {
    if (!name.trim()) return warn('Please enter a product name.');
    if (!isValidISO(purchaseDate)) return warn('Purchase date must look like 2026-09-26.');
    const product = addProduct({
      name: name.trim(),
      brand: brand.trim() || 'Unknown',
      store: store.trim() || 'Unknown',
      category,
      purchaseDate,
      warrantyMonths: months,
      price: price ? Number(price.replace(',', '.')) : undefined,
      currency: draft.currency ?? 'TND',
      photoUri,
      receiptUri: draft.receiptUri,
      reminderDays: settings.defaultReminderDays,
    });
    setDraft(null);
    resetTo('/(tabs)');
    router.push(`/product/${product.id}`);
  };

  return (
    <Screen
      footer={<Button label="Save Product" iconRight={ArrowRight} onPress={save} />}
      contentStyle={{ paddingBottom: space.xl }}>
      <PageTitle title={fromAI ? 'Confirm product' : 'Add product'} />
      <Header
        title={fromAI ? 'Confirm Product Details' : 'Add Product'}
        subtitle={fromAI ? 'Review and edit the information detected by AI' : 'Enter the details from your receipt'}
      />

      <View style={styles.photo}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <CatIcon size={64} color={colors.textFaint} strokeWidth={1.4} />
        )}
        {fromAI ? (
          <View style={styles.aiBadge}>
            <Badge label="Detected by AI" icon={Sparkles} fg={colors.violet} bg={colors.violetSoft} />
          </View>
        ) : null}
        <Pressable style={styles.change} onPress={changePhoto}>
          <ImagePlus size={15} color={colors.white} />
          <T weight="medium" size={13} color={colors.white}>
            {photoUri ? 'Change' : 'Add photo'}
          </T>
        </Pressable>
      </View>

      <Card style={{ marginTop: space.lg }}>
        <Field label="Product name" value={name} onChangeText={setName} placeholder="e.g. BrewMaster Pro" />
        <Field label="Brand" value={brand} onChangeText={setBrand} placeholder="e.g. BrewMaster" />
        <SelectField<Category> label="Category" value={category} onChange={setCategory} options={CATEGORIES.map((c) => ({ label: c, value: c }))} />
        <Field label="Store" value={store} onChangeText={setStore} placeholder="Where did you buy it?" />
        <Field
          label="Purchase date"
          value={purchaseDate}
          onChangeText={setPurchaseDate}
          placeholder="YYYY-MM-DD"
          icon={Calendar}
          keyboardType="numbers-and-punctuation"
        />
        <SelectField<number> label="Warranty period" value={months} onChange={setMonths} options={WARRANTY_OPTIONS} />
        <Field label={`Price (${draft.currency ?? 'TND'})`} value={price} onChangeText={setPrice} placeholder="0" keyboardType="decimal-pad" />

        {isValidISO(purchaseDate) ? (
          <View style={styles.expiry}>
            <T size={13} color={colors.textMuted}>
              Warranty covers you until
            </T>
            <T weight="bold" size={15} color={colors.primary}>
              {formatDate(expiryDate({ purchaseDate, warrantyMonths: months }))}
            </T>
          </View>
        ) : null}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  photo: {
    height: 180,
    borderRadius: radius.xl,
    backgroundColor: colors.card,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  aiBadge: { position: 'absolute', top: 12, left: 12 },
  change: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(11,16,32,0.65)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
  },
  expiry: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: space.md,
    marginTop: space.xs,
  },
});
