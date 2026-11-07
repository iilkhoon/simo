import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { colors, fonts, noPad, tintFor } from '../theme';
import { compact } from '../lib/format';
import { Icon } from './Icon';
import { Pressable3 } from './motion';
import type { PublicUser } from '../lib/types';

export interface Post {
  id: string; mediaType: 'VIDEO' | 'PHOTO'; isPrivate: boolean; locked: boolean; url: string | null; thumbnailUrl: string | null;
  durationSec: number; caption: string; hashtags: string[]; views: number; likesCount: number; commentsCount: number;
  savesCount: number; sharesCount: number; giftsCoins: number; createdAt: string; user: PublicUser; liked: boolean; saved: boolean; following: boolean;
  teaser?: boolean; previewUrl?: string | null; scheduledAt?: string | null; location?: string; commentsOff?: boolean; mine?: boolean;
}

const GAP = 3;

/** Instagram tipli 3 sütunlu şəbəkə; private postlar abunə olmayanlara kilidli göstərilir */
export function PostGrid({ items, width = Dimensions.get('window').width - 32, onLocked }: { items: Post[]; width?: number; onLocked?: (p: Post) => void }) {
  const w = (width - GAP * 2) / 3;
  return (
    <View style={styles.grid}>
      {items.map((p) => {
        // Kilidli post: yalnız serverin bulanıqlaşdırdığı demo (orijinal heç vaxt gəlmir)
        const cover = p.locked ? p.previewUrl ?? null : p.thumbnailUrl ?? (p.mediaType === 'PHOTO' ? p.url : null);
        return (
          <Pressable3 key={p.id} scaleTo={0.96} style={[styles.cell, { width: w, height: w * 1.3, backgroundColor: tintFor(p.id) }]} onPress={() => (p.locked ? onLocked?.(p) : router.push({ pathname: '/post/[id]', params: { id: p.id } }))}>
            {cover ? <Image source={{ uri: cover }} style={StyleSheet.absoluteFill} contentFit="cover" blurRadius={p.locked ? 30 : 0} /> : null}
            {p.locked ? (
              <View style={styles.lock}><Icon name="lock" size={20} color={colors.white} /></View>
            ) : (
              <View style={styles.meta}>
                <Icon name={p.mediaType === 'VIDEO' ? 'play' : 'heart'} size={11} color={colors.white} />
                <Text style={styles.metaText}>{compact(p.mediaType === 'VIDEO' ? p.views : p.likesCount)}</Text>
              </View>
            )}
            {p.isPrivate && !p.locked ? <View style={styles.privTag}><Icon name={p.teaser ? 'eye' : 'lock'} size={10} color={colors.ink} /></View> : null}
            {p.scheduledAt ? <View style={styles.sched}><Icon name="time" size={11} color={colors.white} /><Text style={styles.metaText}>{new Date(p.scheduledAt).toLocaleString(undefined, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</Text></View> : null}
          </Pressable3>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  cell: { borderRadius: 12, overflow: 'hidden' },
  lock: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(16,14,13,0.35)' },
  meta: { position: 'absolute', left: 6, bottom: 6, flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { ...noPad, color: colors.white, fontFamily: fonts.black, fontSize: 11, lineHeight: 14, textShadowColor: 'rgba(0,0,0,0.4)', textShadowRadius: 4 },
  sched: { position: 'absolute', left: 6, top: 6, right: 6, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(16,14,13,0.6)', borderRadius: 8, paddingHorizontal: 5, height: 20 },
  privTag: { position: 'absolute', top: 6, right: 6, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.highlight, alignItems: 'center', justifyContent: 'center' },
});
