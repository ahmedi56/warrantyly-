import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ArrowUp, Bot, ChevronLeft } from '@/components/icons';
import { PageTitle } from '@/components/page-title';
import { goBack, IconButton, T, textStyles } from '@/components/ui';
import { assistantAnswers, fallbackAnswer } from '@/data/guides';
import { colors, radius, space } from '@/theme';

type Msg = { from: 'user' | 'ai'; text: string };

const SUGGESTIONS = ['How do I clean the filter?', 'Descaling', 'Error code', 'Reset machine', 'Is it covered?'];

// Simulated answers. Replace with a backend call to an LLM that knows the user's products.
function answer(q: string) {
  return assistantAnswers.find((a) => a.match.test(q))?.answer ?? fallbackAnswer;
}

export default function Assistant() {
  const [messages, setMessages] = useState<Msg[]>([
    { from: 'ai', text: 'Hi! I can help you troubleshoot, maintain, or claim a warranty for any of your products. What’s going on?' },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const scroll = useRef<ScrollView>(null);

  const send = (text: string) => {
    const q = text.trim();
    if (!q || typing) return;
    setInput('');
    setMessages((m) => [...m, { from: 'user', text: q }]);
    setTyping(true);
    setTimeout(() => {
      setMessages((m) => [...m, { from: 'ai', text: answer(q) }]);
      setTyping(false);
    }, 800);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
      <PageTitle title="AI support" />
      <View style={styles.header}>
        <IconButton icon={ChevronLeft} label="Back" onPress={() => goBack()} />
        <View style={styles.bot}>
          <Bot size={22} color={colors.white} />
        </View>
        <View style={{ flex: 1 }}>
          <T weight="bold" size={17}>
            Ask AI Support
          </T>
          <T size={12} color={colors.success}>
            ● Online · replies instantly
          </T>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scroll}
          contentContainerStyle={{ padding: space.xl, gap: space.md }}
          onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}>
          {messages.map((m, i) => (
            <View key={i} style={[styles.bubble, m.from === 'user' ? styles.user : styles.ai]}>
              <T size={15} color={m.from === 'user' ? colors.white : colors.text} style={{ lineHeight: 22 }}>
                {m.text}
              </T>
            </View>
          ))}
          {typing ? (
            <View style={[styles.bubble, styles.ai]}>
              <T color={colors.textMuted}>Typing…</T>
            </View>
          ) : null}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestions} style={{ flexGrow: 0 }}>
          {SUGGESTIONS.map((s) => (
            <Pressable key={s} onPress={() => send(s)} style={styles.suggestion}>
              <T weight="medium" size={13} color={colors.textMuted}>
                {s}
              </T>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask anything…"
            placeholderTextColor={colors.textFaint}
            onSubmitEditing={() => send(input)}
            returnKeyType="send"
            style={[textStyles.input, { flex: 1, paddingVertical: 12 }]}
          />
          <Pressable onPress={() => send(input)} style={[styles.sendBtn, !input.trim() && { opacity: 0.4 }]} accessibilityLabel="Send">
            <ArrowUp size={20} color={colors.white} strokeWidth={2.4} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: space.xl, paddingVertical: space.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  bot: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.violet, alignItems: 'center', justifyContent: 'center' },
  bubble: { maxWidth: '84%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  user: { alignSelf: 'flex-end', backgroundColor: colors.primary, borderBottomRightRadius: 6 },
  ai: { alignSelf: 'flex-start', backgroundColor: colors.card, borderBottomLeftRadius: 6, borderWidth: 1, borderColor: colors.line },
  suggestions: { gap: 8, paddingHorizontal: space.xl, paddingBottom: space.sm },
  suggestion: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: space.xl, marginBottom: space.sm, paddingLeft: space.lg, paddingRight: 6, backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line },
  sendBtn: { width: 40, height: 40, borderRadius: 13, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});
