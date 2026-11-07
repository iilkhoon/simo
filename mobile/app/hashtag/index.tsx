import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, elev, fonts, gradients, noPad, radius, webNoOutline } from '@/theme';
import { EmptyState, Header, Loader, Screen, T, tap } from '@/components/ui';
import { Appear, Pressable3 } from '@/components/motion';
import { Icon } from '@/components/Icon';
import { api } from '@/lib/api';
import { compact } from '@/lib/format';

/** Heşteq axtarışı: boş sorğuda populyar heşteqlər, yazdıqca prefiksə görə nəticələr */
export default function HashtagSearch() {
  const { t } = useTranslation();
  const [q, setQ] = useState('');
  const [focus, setFocus] = useState(false);
  const [items, setItems] = useState<{ tag: string; count: number }[] | null>(null);
  useEffect(() => {
    const term = q.replace(/^#/, '').trim().toLowerCase();
    const h = setTimeout(() => void api<{ items: { tag: string; count: number }[] }>(`/hashtags/search?q=${encodeURIComponent(term)}`).then((r) => setItems(r.items)).catch(() => setItems((x) => x ?? [])), 220);
    return () => clearTimeout(h);
  }, [q]);
  return (
    <Screen>
      <Header title={t('post2.trending')} />
      <View style={[styles.search, elev(focus ? 2 : 1), focus && { borderColor: colors.brand }]}>
        <Icon name="search" size={18} color={colors.textMuted} />
        <TextInput autoFocus value={q} onChangeText={setQ} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)} placeholder={t('post2.searchPh')} placeholderTextColor={colors.textDim} style={styles.input} autoCapitalize="none" autoCorrect={false} returnKeyType="search" selectionColor={colors.brand} />
        {q ? <Pressable onPress={() => setQ('')} hitSlop={8} style={styles.clear}><Icon name="close" size={14} color={colors.textMuted} /></Pressable> : null}
      </View>
      {items === null ? <View style={{ paddingTop: 12 }}><Loader variant="list" n={6} /></View> : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.tag}
          contentContainerStyle={{ gap: 8, paddingVertical: 12, paddingBottom: 40, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListEmptyComponent={<EmptyState icon="search" title={t('post2.noTags')} sub={t('ui.noTagsSub')} />}
          renderItem={({ item, index }) => {
            const top = index < 3 && !q;
            return (
              <Appear i={index}>
                <Pressable3 scaleTo={0.98} onPress={() => { tap(); router.push({ pathname: '/hashtag/[tag]', params: { tag: item.tag } }); }} style={styles.row}>
                  <View style={[styles.hashDisc, top && { backgroundColor: 'transparent' }]}>
                    {top ? <LinearGradient colors={gradients.nar as unknown as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: 22 }]} /> : null}
                    <Text style={[styles.hash, top && { color: colors.white }]}>#</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <T v="bodyStrong" numberOfLines={1}>#{item.tag}</T>
                    <T v="tiny" color={colors.textMuted}>{t('post2.tagPosts', { n: compact(item.count) })}</T>
                  </View>
                  {top ? <View style={styles.rank}><Text style={styles.rankText}>{index + 1}</Text></View> : null}
                  <Icon name="chevron" size={16} color={colors.textDim} />
                </Pressable3>
              </Appear>
            );
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card, borderRadius: radius.md, paddingHorizontal: 14, height: 52, borderWidth: 1.5, borderColor: 'transparent' },
  input: { flex: 1, minWidth: 0, ...webNoOutline, color: colors.ink, fontFamily: fonts.semibold, fontSize: 15, height: 50 },
  clear: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.bgSunken, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: radius.lg, padding: 12 },
  hashDisc: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.bgSunken, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  hash: { ...noPad, fontFamily: fonts.displayBlack, fontSize: 22, lineHeight: 26, color: colors.ink },
  rank: { minWidth: 24, height: 24, borderRadius: 12, backgroundColor: colors.coinSoft, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  rankText: { ...noPad, fontFamily: fonts.black, fontSize: 12, lineHeight: 15, color: colors.ink },
});
