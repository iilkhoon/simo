import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, fonts, noPad, radius, webNoOutline } from '@/theme';
import { EmptyState, Header, Screen, T } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { api } from '@/lib/api';
import { compact } from '@/lib/format';

/** Heşteq axtarışı: boş sorğuda populyar heşteqlər, yazdıqca prefiksə görə nəticələr */
export default function HashtagSearch() {
  const { t } = useTranslation();
  const [q, setQ] = useState('');
  const [items, setItems] = useState<{ tag: string; count: number }[] | null>(null);
  useEffect(() => {
    const term = q.replace(/^#/, '').trim().toLowerCase();
    const h = setTimeout(() => void api<{ items: { tag: string; count: number }[] }>(`/hashtags/search?q=${encodeURIComponent(term)}`).then((r) => setItems(r.items)).catch(() => setItems([])), 220);
    return () => clearTimeout(h);
  }, [q]);
  return (
    <Screen>
      <Header title={t('post2.trending')} />
      <View style={styles.search}>
        <Icon name="search" size={18} color={colors.textMuted} />
        <TextInput autoFocus value={q} onChangeText={setQ} placeholder={t('post2.searchPh')} placeholderTextColor={colors.textDim} style={styles.input} autoCapitalize="none" />
        {q ? <Pressable onPress={() => setQ('')} hitSlop={8}><Icon name="close" size={16} color={colors.textMuted} /></Pressable> : null}
      </View>
      <FlatList
        data={items ?? []}
        keyExtractor={(i) => i.tag}
        contentContainerStyle={{ gap: 8, paddingVertical: 12, flexGrow: 1 }}
        ListEmptyComponent={items ? <EmptyState icon="search" pose="search" title={t("post2.noTags")} /> : undefined}
        renderItem={({ item, index }) => (
          <Pressable onPress={() => router.push({ pathname: '/hashtag/[tag]', params: { tag: item.tag } })} style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
            <View style={[styles.hashDisc, index < 3 && !q && { backgroundColor: colors.brand }]}><Text style={[styles.hash, index < 3 && !q && { color: colors.white }]}>#</Text></View>
            <View style={{ flex: 1 }}>
              <T v="bodyStrong">#{item.tag}</T>
              <T v="tiny" color={colors.textMuted}>{t('post2.tagPosts', { n: compact(item.count) })}</T>
            </View>
            <Icon name="chevron" size={16} color={colors.textDim} />
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card, borderRadius: radius.md, paddingHorizontal: 14, height: 50 },
  input: { flex: 1, minWidth: 0, ...webNoOutline, color: colors.ink, fontFamily: fonts.semibold, fontSize: 15, height: 50 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: radius.lg, padding: 12 },
  hashDisc: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.bgSunken, alignItems: 'center', justifyContent: 'center' },
  hash: { ...noPad, fontFamily: fonts.displayBlack, fontSize: 22, lineHeight: 26, color: colors.ink },
});
