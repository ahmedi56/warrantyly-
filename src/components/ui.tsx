import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { ChevronLeft, type LucideIcon } from '@/components/icons';
import { colors, font, gradients, radius, shadow, space } from '@/theme';

/* ---------- Text ---------- */

type Weight = keyof typeof font;

export function T({
  weight = 'regular',
  size = 15,
  color = colors.text,
  style,
  ...rest
}: TextProps & { weight?: Weight; size?: number; color?: string }) {
  return (
    <Text
      {...rest}
      style={[{ fontFamily: font[weight], fontSize: size, color, lineHeight: Math.round(size * 1.4) }, style]}
    />
  );
}

/* ---------- Navigation ---------- */

/**
 * Back that is safe when there is no history, e.g. after a browser refresh, a shared
 * link or a deep link opened the screen directly: then it opens `fallback` instead.
 * The default `/` is Home, which sends users who haven't onboarded yet to Welcome.
 */
export function goBack(fallback: Href = '/') {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}

/**
 * Makes `href` the only screen left in the stack, e.g. after signing in or finishing
 * the add-product flow, so Back can't return to screens that no longer apply.
 * Guarded because `dismissAll` fails when nothing is below the current screen.
 */
export function resetTo(href: Href) {
  if (router.canDismiss()) router.dismissAll();
  router.replace(href);
}

/* ---------- Layout ---------- */

export function Screen({
  children,
  scroll = true,
  edges = ['top'],
  contentStyle,
  footer,
}: {
  children: ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  contentStyle?: StyleProp<ViewStyle>;
  footer?: ReactNode;
}) {
  return (
    <SafeAreaView edges={edges} style={styles.screen}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.content, contentStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, { flex: 1 }, contentStyle]}>{children}</View>
      )}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </SafeAreaView>
  );
}

/** `onBack` overrides the Back arrow, e.g. to step back inside a multi-step screen. */
export function Header({ title, subtitle, right, onBack }: { title: string; subtitle?: string; right?: ReactNode; onBack?: () => void }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerRow}>
        <IconButton icon={ChevronLeft} onPress={onBack ?? (() => goBack())} label="Back" />
        <View style={{ flex: 1 }} />
        {right}
      </View>
      <T weight="bold" size={24} style={{ marginTop: space.md }}>
        {title}
      </T>
      {subtitle ? (
        <T color={colors.textMuted} size={14} style={{ marginTop: 4 }}>
          {subtitle}
        </T>
      ) : null}
    </View>
  );
}

/** `flat` drops the shadow, for tinted cards that sit inside or beside other cards. */
export function Card({ children, style, onPress, flat }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; flat?: boolean }) {
  const base = [styles.card, !flat && shadow];
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [base, pressed && styles.pressed, style]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[base, style]}>{children}</View>;
}

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionTitle}>
      <T weight="bold" size={18}>
        {title}
      </T>
      {action ? (
        <Pressable onPress={onAction} hitSlop={10}>
          <T weight="semibold" size={14} color={colors.primary}>
            {action}
          </T>
        </Pressable>
      ) : null}
    </View>
  );
}

/* ---------- Buttons ---------- */

export function tap() {
  if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'light';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
};

export function Button({ label, onPress, icon: Icon, iconRight: IconRight, variant = 'primary', disabled, style, compact }: ButtonProps) {
  const fg = {
    primary: colors.white,
    secondary: colors.primary,
    ghost: colors.primary,
    danger: colors.danger,
    light: colors.text,
  }[variant];

  const inner = (
    <>
      {Icon ? <Icon size={18} color={fg} strokeWidth={2.2} /> : null}
      <T weight="semibold" size={compact ? 14 : 16} color={fg}>
        {label}
      </T>
      {IconRight ? (
        <View style={variant === 'primary' ? styles.btnIconBubble : undefined}>
          <IconRight size={18} color={variant === 'primary' ? colors.primary : fg} strokeWidth={2.4} />
        </View>
      ) : null}
    </>
  );

  const base = [styles.btn, compact && styles.btnCompact, IconRight && variant === 'primary' && styles.btnSplit];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [{ opacity: disabled ? 0.5 : 1 }, pressed && styles.pressed, style]}>
      {variant === 'primary' ? (
        <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[base, styles.btnPrimary]}>
          {inner}
        </LinearGradient>
      ) : (
        <View
          style={[
            base,
            variant === 'secondary' && { backgroundColor: colors.primarySoft },
            variant === 'danger' && { backgroundColor: colors.dangerSoft },
            variant === 'light' && { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
          ]}>
          {inner}
        </View>
      )}
    </Pressable>
  );
}

export function IconButton({
  icon: Icon,
  onPress,
  label,
  dark,
  badge,
}: {
  icon: LucideIcon;
  onPress: () => void;
  label: string;
  dark?: boolean;
  badge?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.iconBtn, dark && styles.iconBtnDark, pressed && styles.pressed]}>
      <Icon size={20} color={dark ? colors.white : colors.text} strokeWidth={2} />
      {badge ? <View style={styles.dot} /> : null}
    </Pressable>
  );
}

/* ---------- Small pieces ---------- */

export function IconTile({ icon: Icon, fg = colors.primary, bg = colors.primarySoft, size = 44 }: { icon: LucideIcon; fg?: string; bg?: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.32, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Icon size={size * 0.48} color={fg} strokeWidth={2} />
    </View>
  );
}

export function Badge({ label, fg, bg, icon: Icon }: { label: string; fg: string; bg: string; icon?: LucideIcon }) {
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      {Icon ? <Icon size={12} color={fg} strokeWidth={2.4} /> : <View style={[styles.badgeDot, { backgroundColor: fg }]} />}
      <T weight="semibold" size={12} color={fg} style={{ lineHeight: 16 }}>
        {label}
      </T>
    </View>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      style={[styles.chip, active && styles.chipActive]}>
      <T weight={active ? 'semibold' : 'medium'} size={13} color={active ? colors.white : colors.textMuted}>
        {label}
      </T>
    </Pressable>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: colors.line }, style]} />;
}

export const textStyles = StyleSheet.create({
  input: {
    fontFamily: font.medium,
    fontSize: 15,
    color: colors.text,
  } as TextStyle,
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: space.xl, paddingBottom: 120, paddingTop: space.sm },
  footer: { paddingHorizontal: space.xl, paddingTop: space.md, paddingBottom: space.xl, backgroundColor: colors.bg },
  header: { marginBottom: space.xl },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  card: { backgroundColor: colors.card, borderRadius: radius.xl, padding: space.lg },
  pressed: { opacity: 0.85, transform: [{ scale: 0.985 }] },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.xxl, marginBottom: space.md },
  btn: { minHeight: 54, borderRadius: radius.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: space.xl },
  btnCompact: { minHeight: 50, borderRadius: radius.md, paddingHorizontal: space.md, gap: 6 },
  btnPrimary: { boxShadow: '0 6px 12px rgba(37, 99, 235, 0.3)' },
  btnSplit: { justifyContent: 'center', paddingRight: 8 },
  btnIconBubble: { position: 'absolute', right: 8, width: 38, height: 38, borderRadius: 12, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  iconBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line },
  iconBtnDark: { backgroundColor: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.16)' },
  dot: { position: 'absolute', top: 9, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.danger, borderWidth: 1.5, borderColor: colors.card },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.pill, alignSelf: 'flex-start' },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  chip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: radius.pill, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
});
