import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { BookOpen, ChevronDown, ChevronUp, Clock3 } from '@/components/icons';
import { PageTitle } from '@/components/page-title';
import { Card, Chip, Header, IconTile, Screen, T } from '@/components/ui';
import { guides, type GuideTopic } from '@/data/guides';
import { colors, space } from '@/theme';

const TOPICS: ('All' | GuideTopic)[] = ['All', 'Getting started', 'Maintenance', 'Troubleshooting'];

export default function Guides() {
  const params = useLocalSearchParams<{ open?: string }>();
  const [topic, setTopic] = useState<(typeof TOPICS)[number]>('All');
  const [open, setOpen] = useState<string | undefined>(params.open);

  const list = guides.filter((g) => topic === 'All' || g.topic === topic);

  return (
    <Screen>
      <PageTitle title="Guides & tutorials" />
      <Header title="Guides & Tutorials" subtitle="Step-by-step help to use and maintain your products" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: space.lg }}>
        {TOPICS.map((t) => (
          <Chip key={t} label={t} active={topic === t} onPress={() => setTopic(t)} />
        ))}
      </ScrollView>

      <View style={{ gap: space.sm }}>
        {list.map((g) => {
          const expanded = open === g.id;
          return (
            <Card key={g.id} onPress={() => setOpen(expanded ? undefined : g.id)}>
              <View style={styles.row}>
                <IconTile icon={BookOpen} />
                <View style={{ flex: 1 }}>
                  <T weight="semibold">{g.title}</T>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Clock3 size={12} color={colors.textFaint} />
                    <T size={12} color={colors.textMuted}>
                      {g.minutes} min · {g.topic}
                    </T>
                  </View>
                </View>
                {expanded ? <ChevronUp size={18} color={colors.textFaint} /> : <ChevronDown size={18} color={colors.textFaint} />}
              </View>
              {expanded ? (
                <View style={styles.steps}>
                  {g.steps.map((s, i) => (
                    <View key={s} style={styles.step}>
                      <View style={styles.stepNum}>
                        <T weight="bold" size={12} color={colors.primary} style={{ lineHeight: 16 }}>
                          {i + 1}
                        </T>
                      </View>
                      <T size={14} style={{ flex: 1 }}>
                        {s}
                      </T>
                    </View>
                  ))}
                </View>
              ) : null}
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  steps: { marginTop: space.lg, gap: 10, paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  step: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  stepNum: { width: 24, height: 24, borderRadius: 8, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
});
