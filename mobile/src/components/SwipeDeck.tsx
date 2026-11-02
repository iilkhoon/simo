import React, { useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import type { PublicUser } from '../lib/types';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, elev, fonts, radius, tintFor, vipColor } from '../theme';
import { GlassPill, IconBtn } from './ui';
import { Icon } from './Icon';
import { VerifiedBadge } from './Badges';

const { width: W } = Dimensions.get('window');
const THRESHOLD = W * 0.28;

export type SwipeAction = 'LIKE' | 'PASS' | 'SUPERLIKE';

function Card({ user, myInterests }: { user: PublicUser; myInterests: string[] }) {
  const { t } = useTranslation();
  const [photo, setPhoto] = useState(0);
  const photos = user.photos.length ? user.photos : user.avatarUrl ? [user.avatarUrl] : [];
  const shared = user.interests.filter((i) => myInterests.includes(i));
  const rest = user.interests.filter((i) => !myInterests.includes(i));
  return (
    <View style={[styles.card, elev(3), { backgroundColor: tintFor(user.name) }]}>
      <View style={styles.clip}>
        {photos[photo] ? <Image source={{ uri: photos[photo] }} style={StyleSheet.absoluteFill} contentFit="cover" transition={120} /> : (
          <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={{ fontFamily: fonts.displayBlack, fontSize: 120, color: 'rgba(26,21,18,0.12)' }}>{user.name.slice(0, 1)}</Text>
          </View>
        )}
        <LinearGradient colors={['rgba(16,14,13,0)', 'rgba(16,14,13,0.82)']} style={styles.scrim} pointerEvents="none" />
        <View style={styles.bars}>
          {photos.length > 1 && photos.map((_, i) => <View key={i} style={[styles.bar, i === photo && { backgroundColor: colors.white }]} />)}
        </View>
        <View style={styles.topTags}>
          {user.online ? <GlassPill label={t('discover.activeNow')} icon="dot" color={colors.white} bg={colors.online} /> : null}
          {user.distanceKm != null ? <GlassPill label={t('common.km', { n: user.distanceKm })} icon="location" /> : null}
        </View>
        <View style={styles.tapZones}>
          <Pressable style={{ flex: 1 }} onPress={() => setPhoto((p) => Math.max(0, p - 1))} />
          <Pressable style={{ flex: 1 }} onPress={() => setPhoto((p) => Math.min(photos.length - 1, p + 1))} />
        </View>
        <Pressable style={styles.info} onPress={() => router.push({ pathname: '/user/[id]', params: { id: user.id } })}>
          {shared.length ? (
            <View style={styles.match}>
              <Icon name="sparkles" size={13} color={colors.ink} />
              <Text style={styles.matchText}>{t('discover.shared', { n: shared.length })}</Text>
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.name} numberOfLines={1}>{user.name}{user.age ? <Text style={styles.age}>  {user.age}</Text> : null}</Text>
            {user.verified ? <VerifiedBadge size={22} color={colors.sky} /> : null}
            <View style={{ flex: 1 }} />
            <View style={styles.more}><Icon name="arrowUp" size={18} color={colors.white} /></View>
          </View>
          {user.city ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <Icon name="location" size={13} color={colors.nightMuted} />
              <Text style={styles.city}>{user.city}</Text>
            </View>
          ) : null}
          {user.bio ? <Text style={styles.bio} numberOfLines={2}>{user.bio}</Text> : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
            {user.isHost ? <GlassPill label={t('profile.host')} icon="sparkles" bg={colors.brand} /> : null}
            {user.vipTier !== 'NONE' ? <GlassPill label={t(`vip.tiers.${user.vipTier}`)} icon="crown" bg={vipColor(user.vipTier).bg} color={vipColor(user.vipTier).fg} /> : null}
            {shared.slice(0, 3).map((i) => <GlassPill key={i} label={t(`interests.${i}`)} icon="heart" bg="rgba(255,255,255,0.92)" color={colors.ink} />)}
            {rest.slice(0, Math.max(0, 4 - shared.length)).map((i) => <GlassPill key={i} label={t(`interests.${i}`)} bg={colors.glassLight} />)}
          </View>
        </Pressable>
      </View>
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
            <Animated.View style={[styles.stamp, styles.stampLike, { opacity: likeOpacity }]}><Text style={[styles.stampText, { color: colors.white }]}>LIKE</Text></Animated.View>
            <Animated.View style={[styles.stamp, styles.stampNope, { opacity: nopeOpacity }]}><Text style={[styles.stampText, { color: colors.ink }]}>NOPE</Text></Animated.View>
            <Animated.View style={[styles.stamp, styles.stampSuper, { opacity: superOpacity }]}><Text style={[styles.stampText, { color: colors.ink }]}>SUPER</Text></Animated.View>
          </Animated.View>
        ) : null}
      </View>
      {top ? (
        <View style={styles.actions}>
          <IconBtn name="close" size={56} sh={2} bg={colors.card} color={colors.ink} iconSize={28} onPress={() => fling('PASS')} />
          <IconBtn name="star" size={48} sh={2} bg={colors.sky} color={colors.ink} onPress={() => fling('SUPERLIKE')} />
          <IconBtn name="heart" size={72} sh={3} bg={colors.brand} color={colors.white} iconSize={34} onPress={() => fling('LIKE')} />
          <IconBtn name="gift" size={48} sh={2} bg={colors.coin} color={colors.ink} onPress={() => router.push({ pathname: '/user/[id]', params: { id: top.id, gift: '1' } })} />
          <IconBtn name="chat" size={56} sh={2} bg={colors.card} color={colors.ink} iconSize={25} onPress={() => router.push({ pathname: '/user/[id]', params: { id: top.id } })} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, borderRadius: radius.xl, marginBottom: 4 },
  clip: { flex: 1, borderRadius: radius.xl, overflow: 'hidden' },
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '62%' },
  bars: { position: 'absolute', top: 12, left: 14, right: 14, flexDirection: 'row', gap: 4 },
  bar: { flex: 1, height: 3.5, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.4)' },
  topTags: { position: 'absolute', top: 26, left: 14, flexDirection: 'row', gap: 6 },
  tapZones: { ...StyleSheet.absoluteFill, flexDirection: 'row', bottom: '45%' },
  info: { position: 'absolute', left: 18, right: 18, bottom: 18 },
  match: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: colors.highlight, paddingHorizontal: 10, height: 26, borderRadius: 13, marginBottom: 10 },
  matchText: { fontFamily: fonts.black, fontSize: 12, color: colors.ink },
  name: { color: colors.white, fontSize: 30, fontFamily: fonts.display, letterSpacing: -1, flexShrink: 1 },
  age: { fontFamily: fonts.displayMedium, fontSize: 26, color: 'rgba(255,255,255,0.85)' },
  city: { color: colors.nightMuted, fontFamily: fonts.semibold, fontSize: 13 },
  more: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.glassLight, alignItems: 'center', justifyContent: 'center' },
  bio: { color: 'rgba(255,255,255,0.9)', marginTop: 8, fontSize: 14, fontFamily: fonts.regular, lineHeight: 19 },
  stamp: { position: 'absolute', top: 60, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 6 },
  stampLike: { left: 24, backgroundColor: colors.online, transform: [{ rotate: '-12deg' }] },
  stampNope: { right: 24, backgroundColor: colors.card, transform: [{ rotate: '12deg' }] },
  stampSuper: { alignSelf: 'center', top: undefined, bottom: 220, backgroundColor: colors.sky },
  stampText: { fontSize: 30, fontFamily: fonts.displayBlack, letterSpacing: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, paddingVertical: 14 },
});
