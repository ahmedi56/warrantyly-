import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Alert, Linking, Platform, Pressable, Share, StyleSheet, Switch, View } from 'react-native';

import { SelectField } from '@/components/fields';
import { Bell, BellRing, ChevronRight, Cloud, CloudOff, Download, LogIn, LogOut, Package, RefreshCw, RotateCcw, Ticket, UserX, type LucideIcon } from '@/components/icons';
import { PageTitle } from '@/components/page-title';
import { Button, Card, Divider, IconTile, Screen, SectionTitle, T } from '@/components/ui';
import { planReminders } from '@/data/reminders';
import { useStore } from '@/data/store';
import type { Settings } from '@/data/types';
import { formatDate, statusOf } from '@/data/warranty';
import { notificationsSupported, requestPermission, sendTestReminder } from '@/notifications';
import { colors, gradients, space } from '@/theme';

function Row({ icon, label, value, onPress, right }: { icon: LucideIcon; label: string; value?: string | number; onPress?: () => void; right?: React.ReactNode }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}>
      <IconTile icon={icon} size={36} fg={colors.text} bg={colors.cardAlt} />
      <T weight="medium" style={{ flex: 1 }}>
        {label}
      </T>
      {right ?? (
        <>
          {value !== undefined ? (
            <View style={styles.count}>
              <T weight="semibold" size={12} color={colors.primary} style={{ lineHeight: 16 }}>
                {value}
              </T>
            </View>
          ) : null}
          <ChevronRight size={18} color={colors.textFaint} />
        </>
      )}
    </Pressable>
  );
}

function confirm(title: string, message: string, onYes: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onYes();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Continue', style: 'destructive', onPress: onYes },
  ]);
}

export default function Profile() {
  const { settings, updateSettings, products, claims, reset, userId, outbox, syncStatus, lastSyncedAt, syncNow, signOut, deleteAccount } = useStore();
  const expiring = products.filter((p) => statusOf(p) === 'expiring').length;
  const initials = settings.userName.slice(0, 2).toUpperCase();

  const nextReminder = planReminders(products)[0];
  const nextProduct = products.find((p) => p.id === nextReminder?.productId);

  const toggleNotifications = async (on: boolean) => {
    if (on && !(await requestPermission())) {
      if (Platform.OS === 'web') return;
      Alert.alert('Notifications are blocked', 'Allow notifications for Warrantyly in your phone settings to get expiry reminders.', [
        { text: 'Not now', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]);
      return;
    }
    updateSettings({ notifications: on });
  };

  const testReminder = async () => {
    if (!(await requestPermission())) return toggleNotifications(true);
    await sendTestReminder(nextProduct ?? products[0]);
    Alert.alert('Test reminder on its way', 'It will arrive in about 5 seconds. Lock your phone or leave the app to see it.');
  };

  const syncLabel =
    syncStatus === 'syncing'
      ? 'Syncing…'
      : syncStatus === 'offline' || outbox.length
        ? `Offline · ${outbox.length} change${outbox.length === 1 ? '' : 's'} waiting`
        : lastSyncedAt
          ? `Backed up · ${new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
          : 'Backed up';

  const logOut = () => {
    if (!userId) {
      return confirm('Log out?', 'You will return to the welcome screen.', () => {
        updateSettings({ onboarded: false });
        router.replace('/welcome');
      });
    }
    const warning = outbox.length
      ? `${outbox.length} change${outbox.length === 1 ? ' hasn’t' : 's haven’t'} been backed up yet and will be lost.`
      : 'Your data stays safe in your account. It will be removed from this phone.';
    confirm('Log out?', warning, async () => {
      await signOut();
      router.replace('/welcome');
    });
  };

  const removeAccount = () =>
    confirm('Delete your account?', 'All your products, claims and receipts will be permanently deleted. This cannot be undone.', async () => {
      try {
        await deleteAccount();
        router.replace('/welcome');
      } catch {
        const msg = 'Could not delete your account. Check your connection and try again.';
        if (Platform.OS === 'web') window.alert(msg);
        else Alert.alert('Something went wrong', msg);
      }
    });

  const exportData = () => {
    Share.share({ title: 'Warrantyly export', message: JSON.stringify({ products, claims }, null, 2) }).catch(() => {});
  };

  return (
    <Screen>
      <PageTitle title="Profile" />
      <T weight="bold" size={26} style={{ marginTop: space.sm, lineHeight: 32 }}>
        Profile
      </T>

      <Card style={styles.user}>
        <LinearGradient colors={gradients.primary} style={styles.avatar}>
          <T weight="bold" size={22} color={colors.white}>
            {initials}
          </T>
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <T weight="bold" size={18}>
            {settings.userName}
          </T>
          {userId ? (
            <>
              <T size={13} color={colors.textMuted}>
                {settings.email}
              </T>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
                {syncStatus === 'offline' ? <CloudOff size={13} color={colors.warning} /> : <Cloud size={13} color={colors.success} />}
                <T size={12} color={syncStatus === 'offline' || outbox.length ? colors.warning : colors.success}>
                  {syncLabel}
                </T>
              </View>
            </>
          ) : (
            <T size={13} color={colors.textMuted}>
              Saved on this phone only
            </T>
          )}
        </View>
        {userId ? (
          <Pressable onPress={syncNow} hitSlop={10} accessibilityLabel="Sync now" disabled={syncStatus === 'syncing'}>
            <RefreshCw size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </Card>

      {!userId ? (
        <Card flat style={styles.backup}>
          <T weight="semibold">Back up your warranties</T>
          <T size={13} color={colors.textMuted} style={{ marginTop: 2, marginBottom: space.md }}>
            Sign in to keep your receipts safe if you lose or change your phone.
          </T>
          <Button label="Sign in" icon={LogIn} compact onPress={() => router.push('/login')} />
        </Card>
      ) : null}

      <Card style={styles.group}>
        <Row icon={Package} label="My Products" value={products.length} onPress={() => router.push('/products')} />
        <Divider />
        <Row icon={Bell} label="Expiring soon" value={expiring} onPress={() => router.push('/products?status=expiring')} />
        <Divider />
        <Row icon={Ticket} label="Support claims" value={claims.length} onPress={() => router.push('/support')} />
      </Card>

      <SectionTitle title="Preferences" />
      <Card style={styles.group}>
        <Row
          icon={Bell}
          label="Notifications"
          right={
            <Switch
              value={settings.notifications}
              onValueChange={toggleNotifications}
              trackColor={{ true: colors.primary, false: colors.line }}
              thumbColor={colors.white}
            />
          }
        />
        <T size={13} color={colors.textMuted} style={{ marginLeft: 48, marginTop: -4, marginBottom: space.xs }}>
          {!notificationsSupported
            ? 'Reminders work in the phone app.'
            : !settings.notifications
              ? 'Off — you won’t be reminded before warranties end.'
              : nextReminder
                ? `Next: ${nextProduct?.name ?? 'product'} · ${formatDate(nextReminder.date)}`
                : 'No upcoming reminders.'}
        </T>
        {notificationsSupported && settings.notifications ? (
          <>
            <Divider />
            <Row icon={BellRing} label="Send test reminder" onPress={testReminder} />
          </>
        ) : null}
        <View style={{ paddingTop: space.sm }}>
          <SelectField<Settings['language']>
            label="Language"
            value={settings.language}
            onChange={(language) => updateSettings({ language })}
            options={(['English', 'Français', 'Español', 'العربية'] as const).map((l) => ({ label: l, value: l }))}
          />
          <SelectField<number>
            label="Default reminder"
            value={settings.defaultReminderDays}
            onChange={(defaultReminderDays) => updateSettings({ defaultReminderDays })}
            options={[30, 14, 7, 3, 1].map((d) => ({ label: `${d} day${d === 1 ? '' : 's'} before expiry`, value: d }))}
          />
        </View>
      </Card>

      <SectionTitle title="Your data" />
      <Card style={styles.group}>
        <Row icon={Download} label="Export my data" onPress={exportData} />
        <Divider />
        {userId ? (
          <Row icon={UserX} label="Delete account" onPress={removeAccount} />
        ) : (
          <Row
            icon={RotateCcw}
            label="Reset demo data"
            onPress={() => confirm('Reset demo data?', 'Your products and claims will be replaced with the demo set.', reset)}
          />
        )}
      </Card>

      <Button
        label="Log Out"
        icon={LogOut}
        variant="danger"
        style={{ marginTop: space.xl }}
        onPress={logOut}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  user: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: space.lg },
  avatar: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  backup: { marginTop: space.md, backgroundColor: colors.primarySoft },
  group: { marginTop: space.md, paddingVertical: space.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  count: { minWidth: 24, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, backgroundColor: colors.primarySoft, alignItems: 'center' },
});
