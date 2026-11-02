import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, fonts, noPad, radius } from '@/theme';
import { EmptyState, Header, Loader, Screen } from '@/components/ui';
import { PostGrid, type Post } from '@/components/PostGrid';
import { api } from '@/lib/api';
import { compact } from '@/lib/format';

/** Heşteq səhifəsi: bu heşteqli postlar (populyarlığa görə) */
export default function HashtagPage() {
  const { t } = useTranslation();
  const { tag } = useLocalSearchParams<{ tag: string }>();
  const [items, setItems] = useState<Post[] | null>(null);
  useEffect(() => {
    void api<{ items: Post[] }>(`/videos/hashtag/${encodeURIComponent(tag ?? '')}`).then((r) => setItems(r.items)).catch(() => setItems([]));
  }, [tag]);
  return (
    <Screen>
      <Header title={`#${tag}`} />
      <ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.big}>#</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.tag} numberOfLines={1}>{tag}</Text>
            <Text style={styles.count}>{t('post2.tagPosts', { n: compact(items?.length ?? 0) })}</Text>
          </View>
        </View>
        {items === null ? <Loader /> : items.length ? (
          <PostGrid items={items} onLocked={(p) => router.push({ pathname: '/user/[id]', params: { id: p.user.id, tab: 'private' } })} />
        ) : <EmptyState icon="video" pose="search" title={t('posts.empty')} />}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.ink, borderRadius: radius.xl, padding: 18 },
  big: { ...noPad, width: 64, height: 64, borderRadius: 32, backgroundColor: colors.brand, color: colors.white, textAlign: 'center', fontFamily: fonts.displayBlack, fontSize: 34, lineHeight: 64, overflow: 'hidden' },
  tag: { ...noPad, color: colors.white, fontFamily: fonts.displayBlack, fontSize: 24, lineHeight: 30 },
  count: { ...noPad, color: colors.nightMuted, fontFamily: fonts.semibold, fontSize: 13, lineHeight: 17, marginTop: 2 },
});
