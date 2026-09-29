import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View, type KeyboardTypeOptions } from 'react-native';

import { Check, ChevronDown, type LucideIcon } from '@/components/icons';
import { T, textStyles } from '@/components/ui';
import { colors, radius, space } from '@/theme';

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  icon: Icon,
  hint,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  icon?: LucideIcon;
  hint?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrap}>
      <T weight="medium" size={13} color={colors.textMuted} style={styles.label}>
        {label}
      </T>
      <View style={[styles.box, focused && styles.boxFocused]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textFaint}
          keyboardType={keyboardType}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[textStyles.input, styles.input]}
        />
        {Icon ? <Icon size={18} color={colors.textMuted} /> : null}
      </View>
      {hint ? (
        <T size={12} color={colors.textFaint} style={{ marginTop: 4 }}>
          {hint}
        </T>
      ) : null}
    </View>
  );
}

export function SelectField<V extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: V;
  options: { label: string; value: V }[];
  onChange: (v: V) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <View style={styles.wrap}>
      <T weight="medium" size={13} color={colors.textMuted} style={styles.label}>
        {label}
      </T>
      <Pressable style={styles.box} onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={label}>
        <T weight="medium" size={15} style={{ flex: 1 }}>
          {current?.label ?? 'Select…'}
        </T>
        <ChevronDown size={18} color={colors.textMuted} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <T weight="bold" size={17} style={{ marginBottom: space.sm }}>
              {label}
            </T>
            <ScrollView style={{ maxHeight: 380 }}>
              {options.map((o) => (
                <Pressable
                  key={String(o.value)}
                  style={styles.option}
                  onPress={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}>
                  <T weight={o.value === value ? 'semibold' : 'regular'} size={15} color={o.value === value ? colors.primary : colors.text}>
                    {o.label}
                  </T>
                  {o.value === value ? <Check size={18} color={colors.primary} /> : null}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: space.md },
  label: { marginBottom: 6 },
  box: {
    minHeight: 50,
    borderRadius: radius.md,
    backgroundColor: colors.cardAlt,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  boxFocused: { borderColor: colors.primary, backgroundColor: colors.card },
  input: { flex: 1, paddingVertical: 12 },
  backdrop: { flex: 1, backgroundColor: 'rgba(11,16,32,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: space.xl, paddingBottom: 40 },
  handle: { width: 42, height: 5, borderRadius: 3, backgroundColor: colors.line, alignSelf: 'center', marginBottom: space.lg },
  option: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
});
