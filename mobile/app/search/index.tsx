import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, fonts, noPad, radius, webNoOutline } from '@/theme';
import { EmptyState, Header, Screen, T, Tabs } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { Avatar } from '@/components/Avatar';
import { VerifiedBadge } from '@/components/Badges';
import { api } from '@/lib/api';
import { compact } from '@/lib/format';
import type { PublicUser } from '@/lib/types';

type Mode = 'users' | 'tags';

/** Axtarış: hesablar (ad və ya ID ilə) və heşteqlər */
export default function Search() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ tab?: Mode }>();
  const [mode, setMode] = useState<Mode>(params.tab === 'tags' ? 'tags' : 'users');
  const [q, setQ] = useState('');
  const [users, setUsers] = useState<PublicUser[] | null>(null);
  const [tags, setTags] = useState<{ tag: string; count: number }[] | null>(null);

  useEffect(() => {
    const term = q.trim();
    const h = setTimeout(() => {
      if (mode === 'users') {
        if (term.replace(/^@|^id:?/i, '').length < 1) { setUsers(null); return; }
        void api<{ items: PublicUser[] }>(`/users/search?q=${encodeURIComponent(term)}`).then((r) => setUsers(r.items)).catch(() => setUsers([]));
      } else {
        const tg = term.replace(/^#/, '').toLowerCase();
        void api<{ items: { tag: string; count: number }[] }>(`/hashtags/search?q=${encodeURIComponent(tg)}`).then((r) => setTags(r.items)).catch(() => setTags([]));
      }
    }, 250);
    return () => clearTimeout(h);
  }, [q, mode]);

  return (
    <Screen>
      <Header title={t('find.title')} />
      <View style={styles.search}>
        <Icon name="search" size={18} color={colors.textMuted} />
        <TextInput
          autoFocus value={q} onChangeText={setQ} autoCapitalize="none" autoCorrect={false} returnKeyType="search"
          placeholder={mode === 'users' ? t('find.usersPh') : t('post2.searchPh')} placeholderTextColor={colors.textDim} style={styles.input}
        />
        {q ? <Pressable onPress={() => setQ('')} hitSlop={8}><Icon name="close" size={16} color={colors.textMuted} /></Pressable> : null}
      </View>
      <View style={{ marginTop: 10 }}>
        <Tabs<Mode> value={mode} onChange={setMode} options={[{ key: 'users', label: t('find.users') }, { key: 'tags', label: t('find.tags') }]} />
      </View>
      {mode === 'users' ? (
        <FlatList
          key="users"
          data={users ?? []}
          keyExtractor={(u) => u.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ gap: 8, paddingVertical: 12, flexGrow: 1 }}
          ListEmptyComponent={<EmptyState icon="search" pose="search" title={users ? t('find.none') : t('find.hint')} />}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push({ pathname: '/user/[id]', params: { id: item.id } })} style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
              <Avatar uri={item.avatarUrl} size={48} online={item.online} name={item.name} vipTier={item.vipTier} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <T v="bodyStrong" numberOfLines={1} style={{ flexShrink: 1 }}>{item.name}{item.age ? `, ${item.age}` : ''}</T>
                  {item.verified ? <VerifiedBadge size={16} color={colors.sky} /> : null}
                </View>
                <T v="tiny" color={colors.textMuted} numberOfLines={1}>ID {item.shortId}{item.city ? ` · ${item.city}` : ''}{item.isHost ? ` · ${t('find.host')}` : ''}</T>
              </View>
              <Icon name="chevron" size={16} color={colors.textDim} />
            </Pressable>
          )}
        />
      ) : (
        <FlatList
          key="tags"
          data={tags ?? []}
          keyExtractor={(i) => i.tag}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ gap: 8, paddingVertical: 12, flexGrow: 1 }}
          ListEmptyComponent={tags ? <EmptyState icon="search" pose="search" title={t('post2.noTags')} /> : undefined}
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
      )}
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
