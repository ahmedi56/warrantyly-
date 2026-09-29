import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Share, StyleSheet, TextInput, View } from 'react-native';

import { CircleCheck, CircleX, MessageCircle, PencilLine, Send, ShieldCheck, Wrench } from '@/components/icons';
import { PageTitle } from '@/components/page-title';
import { CoverageRing } from '@/components/product';
import { Button, Card, Chip, goBack, Header, IconTile, Screen, T, textStyles } from '@/components/ui';
import { useProduct, useStore } from '@/data/store';
import { daysLeft, expiryDate, formatDate, formatPrice, statusOf } from '@/data/warranty';
import { colors, radius, space } from '@/theme';

const QUICK_ISSUES = ['Won’t turn on', 'Leaking', 'Strange noise', 'Error code', 'Broken part'];

function Step({ n, title, sub, done, children }: { n: number; title: string; sub: string; done: boolean; children?: React.ReactNode }) {
  return (
    <Card style={{ gap: space.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={[styles.num, done && { backgroundColor: colors.success }]}>
          {done ? <CircleCheck size={18} color={colors.white} /> : <T weight="bold" size={14} color={colors.primary}>{n}</T>}
        </View>
        <View style={{ flex: 1 }}>
          <T weight="semibold">{title}</T>
          <T size={13} color={colors.textMuted}>
            {sub}
          </T>
        </View>
      </View>
      {children}
    </Card>
  );
}

export default function ClaimFlow() {
  const { id, claim: claimId } = useLocalSearchParams<{ id: string; claim?: string }>();
  const product = useProduct(id);
  const { addClaim, claims, settings } = useStore();
  const existing = claims.find((c) => c.id === claimId);
  const [issue, setIssue] = useState(existing?.issue ?? '');
  const [submitted, setSubmitted] = useState(!!existing);

  if (!product) return <Redirect href="/(tabs)/support" />;

  const covered = statusOf(product) !== 'expired';
  const summary = [
    `Warranty claim — ${product.name}`,
    `Brand: ${product.brand}`,
    product.serial ? `Serial: ${product.serial}` : null,
    `Purchased: ${formatDate(product.purchaseDate)} at ${product.store} (${formatPrice(product)})`,
    `Warranty: ${covered ? 'Active' : 'Expired'} until ${formatDate(expiryDate(product))}`,
    `Issue: ${issue.trim()}`,
    `Customer: ${settings.userName} · ${settings.email}`,
    'Proof of purchase attached.',
  ]
    .filter(Boolean)
    .join('\n');

  if (submitted) {
    return (
      <Screen footer={<Button label="Share with store" icon={Send} onPress={() => Share.share({ message: summary }).catch(() => {})} />}>
        <PageTitle title={`Claim ready · ${product.name}`} />
        <Header title="Claim ready" subtitle="Send this to the store or manufacturer" />
        <Card style={styles.productCard}>
          <CoverageRing product={product} size={56} />
          <View style={{ flex: 1 }}>
            <T weight="semibold">{product.name}</T>
            <T size={13} color={covered ? colors.success : colors.danger}>
              {covered ? `Covered · ${daysLeft(product)} days left` : 'Warranty expired'}
            </T>
          </View>
        </Card>
        <View style={styles.summary}>
          <T size={14} style={{ lineHeight: 23 }}>
            {summary}
          </T>
        </View>
        <Button label="Back to product" variant="light" style={{ marginTop: space.lg }} onPress={() => goBack(`/product/${product.id}`)} />
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <Button
          label="Start a Claim"
          icon={Wrench}
          disabled={!issue.trim()}
          onPress={() => {
            addClaim(product.id, issue.trim());
            setSubmitted(true);
          }}
        />
      }>
      <PageTitle title={`Report a problem · ${product.name}`} />
      <Header title="Something broke?" subtitle="Let’s get it fixed in three steps" />

      <View style={{ gap: space.md }}>
        <Step n={1} title="Describe the issue" sub="Tell us what’s happening" done={!!issue.trim()}>
          <View style={styles.chips}>
            {QUICK_ISSUES.map((q) => (
              <Chip key={q} label={q} active={issue === q} onPress={() => setIssue(q)} />
            ))}
          </View>
          <View style={styles.textarea}>
            <PencilLine size={16} color={colors.textFaint} style={{ marginTop: 3 }} />
            <TextInput
              value={issue}
              onChangeText={setIssue}
              placeholder="e.g. The machine leaks from the bottom after brewing"
              placeholderTextColor={colors.textFaint}
              multiline
              style={[textStyles.input, { flex: 1, minHeight: 70, textAlignVertical: 'top' }]}
            />
          </View>
        </Step>

        <Step n={2} title="Check warranty status" sub="We verified your coverage" done>
          <View style={[styles.coverage, { backgroundColor: covered ? colors.successSoft : colors.dangerSoft }]}>
            {covered ? <ShieldCheck size={20} color={colors.success} /> : <CircleX size={20} color={colors.danger} />}
            <T weight="medium" size={14} color={covered ? colors.success : colors.danger} style={{ flex: 1 }}>
              {covered
                ? `${product.name} is covered until ${formatDate(expiryDate(product))}`
                : `Warranty ended on ${formatDate(expiryDate(product))} — paid repair options only`}
            </T>
          </View>
        </Step>

        <Step n={3} title="Get solutions" sub="Repair options and next steps" done={false}>
          <Card flat onPress={() => router.push('/assistant')} style={styles.tryFirst}>
            <IconTile icon={MessageCircle} size={38} fg={colors.violet} bg={colors.card} />
            <T size={13} color={colors.textMuted} style={{ flex: 1 }}>
              Try a quick fix with AI Support first — many issues are solved in a minute.
            </T>
          </Card>
        </Step>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  num: { width: 32, height: 32, borderRadius: 11, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  textarea: { flexDirection: 'row', gap: 8, backgroundColor: colors.cardAlt, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: space.md },
  coverage: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: space.md, borderRadius: radius.md },
  tryFirst: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.violetSoft, padding: space.md },
  productCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  summary: { marginTop: space.md, backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.line, padding: space.lg },
});
