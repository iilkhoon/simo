import React, { useCallback, useEffect, useState } from 'react';
import { Dimensions, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, fonts, gradients, noPad } from '@/theme';
import { Btn, EmptyState, GradientCard, Header, Loader, Screen } from '@/components/ui';
import { Appear } from '@/components/motion';
import { PostGrid, type Post } from '@/components/PostGrid';
import { api } from '@/lib/api';
import { compact } from '@/lib/format';

/** Heşteq səhifəsi: bu heşteqli postlar (populyarlığa görə) */
export default function HashtagPage() {
  const { t } = useTranslation();
  const { tag } = useLocalSearchParams<{ tag: string }>();
  const [items, setItems] = useState<Post[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(() => api<{ items: Post[] }>(`/videos/hashtag/${encodeURIComponent(tag ?? '')}`).then((r) => setItems(r.items)).catch(() => setItems((x) => x ?? [])), [tag]);
  useEffect(() => { void load(); }, [load]);
  return (
    <Screen>
      <Header title={`#${tag}`} />
      <ScrollView
        contentContainerStyle={{ gap: 14, paddingBottom: 40, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.brand} colors={[colors.brand]} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
      >
        <Appear i={0}>
          <GradientCard g="night" glow={colors.brand} inner={styles.hero}>
            <View style={styles.disc}>
              <LinearGradient colors={gradients.nar as unknown as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
              <Text style={styles.big}>#</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.tag} numberOfLines={1}>{tag}</Text>
              <Text style={styles.count}>{t('post2.tagPosts', { n: compact(items?.length ?? 0) })}</Text>
            </View>
          </GradientCard>
        </Appear>
        {items === null ? <Loader variant="grid" n={6} width={(Dimensions.get('window').width - 32 - 24) / 3} /> : items.length ? (
          <Appear i={1} from="fade">
            <PostGrid items={items} onLocked={(p) => router.push({ pathname: '/user/[id]', params: { id: p.user.id, tab: 'private' } })} />
          </Appear>
        ) : (
          <EmptyState
            art="camera"
            title={t('posts.empty')}
            sub={t('u2.tagEmptySub')}
            action={<Btn full={false} size="md" icon="add" title={t('posts.new')} onPress={() => router.push({ pathname: '/video/upload', params: { type: 'PHOTO' } })} />}
          />
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18 },
  disc: { width: 64, height: 64, borderRadius: 32, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  big: { ...noPad, color: colors.white, fontFamily: fonts.displayBlack, fontSize: 34, lineHeight: 40 },
  tag: { ...noPad, color: colors.white, fontFamily: fonts.displayBlack, fontSize: 24, lineHeight: 30 },
  count: { ...noPad, color: colors.nightMuted, fontFamily: fonts.semibold, fontSize: 13, lineHeight: 17, marginTop: 2 },
});
