import React, { useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import type { PublicUser } from '../lib/types';
import { colors, gradients, radius } from '../theme';
import { Icon } from './Icon';
import { HostBadge, LevelBadge, VerifiedBadge, VipBadge } from './Badges';

const { width: W } = Dimensions.get('window');
const THRESHOLD = W * 0.28;

export type SwipeAction = 'LIKE' | 'PASS' | 'SUPERLIKE';

function Card({ user, myInterests }: { user: PublicUser; myInterests: string[] }) {
  const { t } = useTranslation();
  const [photo, setPhoto] = useState(0);
  const photos = user.photos.length ? user.photos : user.avatarUrl ? [user.avatarUrl] : [];
  const shared = user.interests.filter((i) => myInterests.includes(i));
  return (
    <View style={styles.card}>
      {photos[photo] ? <Image source={{ uri: photos[photo] }} style={StyleSheet.absoluteFill} contentFit="cover" transition={120} /> : null}
      <View style={styles.bars}>
        {photos.length > 1 && photos.map((_, i) => <View key={i} style={[styles.bar, i === photo && { backgroundColor: '#fff' }]} />)}
      </View>
      <View style={styles.tapZones}>
        <Pressable style={{ flex: 1 }} onPress={() => setPhoto((p) => Math.max(0, p - 1))} />
        <Pressable style={{ flex: 1 }} onPress={() => setPhoto((p) => Math.min(photos.length - 1, p + 1))} />
      </View>
      <LinearGradient colors={gradients.card} style={styles.info} pointerEvents="box-none">
        <Pressable onPress={() => router.push({ pathname: '/user/[id]', params: { id: user.id } })}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.name} numberOfLines={1}>{user.name}{user.age ? `, ${user.age}` : ''}</Text>
            {user.verified ? <VerifiedBadge size={22} /> : null}
          </View>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {user.online ? (
              <View style={styles.online}><View style={styles.dot} /><Text style={styles.onlineText}>{t('common.online')}</Text></View>
            ) : null}
            {user.isHost ? <HostBadge /> : null}
            <VipBadge tier={user.vipTier} />
            <LevelBadge kind="charm" level={user.charmLevel} />
          </View>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
            {user.distanceKm != null ? (
              <View style={styles.meta}><Icon name="location" size={14} color={colors.textMuted} /><Text style={styles.metaText}>{t('common.km', { n: user.distanceKm })}</Text></View>
            ) : null}
            {user.city ? <Text style={styles.metaText}>{user.city}</Text> : null}
          </View>
          {user.bio ? <Text style={styles.bio} numberOfLines={2}>{user.bio}</Text> : null}
          {shared.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {shared.slice(0, 4).map((i) => (
                <View key={i} style={styles.tag}><Text style={styles.tagText}>{t(`interests.${i}`)}</Text></View>
              ))}
            </View>
          ) : null}
        </Pressable>
      </LinearGradient>
    </View>
  );
}

export function SwipeDeck({ users, myInterests, onSwipe }: { users: PublicUser[]; myInterests: string[]; onSwipe: (u: PublicUser, a: SwipeAction) => void }) {
  const pos = useRef(new Animated.ValueXY()).current;
  const usersRef = useRef(users);
  usersRef.current = users;

  const fling = (action: SwipeAction) => {
    const u = usersRef.current[0];
    if (!u) return;
    void Haptics.impactAsync(action === 'PASS' ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const to = action === 'LIKE' ? { x: W * 1.5, y: 40 } : action === 'PASS' ? { x: -W * 1.5, y: 40 } : { x: 0, y: -900 };
    Animated.timing(pos, { toValue: to, duration: 260, useNativeDriver: true }).start(() => {
      pos.setValue({ x: 0, y: 0 });
      onSwipe(u, action);
    });
  };
  const flingRef = useRef(fling);
  flingRef.current = fling;

  const responder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 || Math.abs(g.dy) > 12,
        onPanResponderMove: Animated.event([null, { dx: pos.x, dy: pos.y }], { useNativeDriver: false }),
        onPanResponderRelease: (_, g) => {
          if (g.dx > THRESHOLD) flingRef.current('LIKE');
          else if (g.dx < -THRESHOLD) flingRef.current('PASS');
          else if (g.dy < -THRESHOLD * 1.4) flingRef.current('SUPERLIKE');
          else Animated.spring(pos, { toValue: { x: 0, y: 0 }, friction: 5, useNativeDriver: false }).start();
        },
      }),
    [pos],
  );

  const rotate = pos.x.interpolate({ inputRange: [-W, 0, W], outputRange: ['-12deg', '0deg', '12deg'] });
  const likeOpacity = pos.x.interpolate({ inputRange: [0, THRESHOLD], outputRange: [0, 1], extrapolate: 'clamp' });
  const nopeOpacity = pos.x.interpolate({ inputRange: [-THRESHOLD, 0], outputRange: [1, 0], extrapolate: 'clamp' });
  const superOpacity = pos.y.interpolate({ inputRange: [-THRESHOLD * 1.4, 0], outputRange: [1, 0], extrapolate: 'clamp' });
  const nextScale = pos.x.interpolate({ inputRange: [-W, 0, W], outputRange: [1, 0.94, 1], extrapolate: 'clamp' });

  const top = users[0];
  const next = users[1];

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        {next ? (
          <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scale: nextScale }] }]}>
            <Card user={next} myInterests={myInterests} />
          </Animated.View>
        ) : null}
        {top ? (
          <Animated.View key={top.id} {...responder.panHandlers} style={[StyleSheet.absoluteFill, { transform: [{ translateX: pos.x }, { translateY: pos.y }, { rotate }] }]}>
            <Card user={top} myInterests={myInterests} />
            <Animated.View style={[styles.stamp, styles.stampLike, { opacity: likeOpacity }]}><Text style={[styles.stampText, { color: colors.online }]}>LIKE</Text></Animated.View>
            <Animated.View style={[styles.stamp, styles.stampNope, { opacity: nopeOpacity }]}><Text style={[styles.stampText, { color: colors.danger }]}>NOPE</Text></Animated.View>
            <Animated.View style={[styles.stamp, styles.stampSuper, { opacity: superOpacity }]}><Text style={[styles.stampText, { color: colors.diamond }]}>SUPER</Text></Animated.View>
          </Animated.View>
        ) : null}
      </View>
      {top ? (
        <View style={styles.actions}>
          <Pressable onPress={() => fling('PASS')} style={[styles.action, { width: 60, height: 60 }]}><Icon name="close" size={30} color={colors.danger} /></Pressable>
          <Pressable onPress={() => fling('SUPERLIKE')} style={[styles.action, { width: 50, height: 50 }]}><Icon name="star" size={24} color={colors.diamond} /></Pressable>
          <Pressable onPress={() => fling('LIKE')}>
            <LinearGradient colors={gradients.primary} style={[styles.action, { width: 70, height: 70, borderWidth: 0 }]}>
              <Icon name="heart" size={34} color="#fff" />
            </LinearGradient>
          </Pressable>
          <Pressable onPress={() => router.push({ pathname: '/user/[id]', params: { id: top.id, gift: '1' } })} style={[styles.action, { width: 50, height: 50 }]}>
            <Icon name="gift" size={22} color={colors.gold} />
          </Pressable>
          <Pressable onPress={() => router.push({ pathname: '/user/[id]', params: { id: top.id } })} style={[styles.action, { width: 60, height: 60 }]}>
            <Icon name="chat" size={26} color={colors.violet} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, borderRadius: radius.xl, overflow: 'hidden', backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border },
  bars: { position: 'absolute', top: 10, left: 12, right: 12, flexDirection: 'row', gap: 4 },
  bar: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.35)' },
  tapZones: { ...StyleSheet.absoluteFill, flexDirection: 'row', bottom: '40%' },
  info: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 18, paddingTop: 80 },
  name: { color: '#fff', fontSize: 30, fontWeight: '800', flexShrink: 1 },
  online: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(61,220,151,0.18)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.online },
  onlineText: { color: colors.online, fontSize: 11, fontWeight: '700' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { color: colors.textMuted, fontSize: 13 },
  bio: { color: '#fff', marginTop: 8, fontSize: 14, opacity: 0.9 },
  tag: { backgroundColor: 'rgba(255,255,255,0.14)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  tagText: { color: '#fff', fontSize: 12 },
  stamp: { position: 'absolute', top: 50, borderWidth: 4, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 },
  stampLike: { left: 24, borderColor: colors.online, transform: [{ rotate: '-15deg' }] },
  stampNope: { right: 24, borderColor: colors.danger, transform: [{ rotate: '15deg' }] },
  stampSuper: { alignSelf: 'center', top: undefined, bottom: 180, borderColor: colors.diamond },
  stampText: { fontSize: 34, fontWeight: '900', letterSpacing: 2 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, paddingVertical: 14 },
  action: { borderRadius: 40, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
});
