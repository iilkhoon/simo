import React, { useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import type { PublicUser } from '../lib/types';
import { colors, fonts, radius, tintFor } from '../theme';
import { IconBtn, Tag } from './ui';
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
    <View style={{ flex: 1, marginRight: 6, marginBottom: 6 }}>
      <View style={styles.cardShadow} />
      <View style={[styles.card, { backgroundColor: tintFor(user.name) }]}>
        {photos[photo] ? <Image source={{ uri: photos[photo] }} style={StyleSheet.absoluteFill} contentFit="cover" transition={120} /> : null}
        <View style={styles.bars}>
          {photos.length > 1 && photos.map((_, i) => <View key={i} style={[styles.bar, i === photo && { backgroundColor: colors.card }]} />)}
        </View>
        <View style={styles.topTags}>
          {user.online ? <Tag label={t('common.online').toUpperCase()} bg={colors.online} fg={colors.white} /> : null}
          {user.distanceKm != null ? <Tag label={t('common.km', { n: user.distanceKm })} icon="location" bg={colors.card} /> : null}
        </View>
        <View style={styles.tapZones}>
          <Pressable style={{ flex: 1 }} onPress={() => setPhoto((p) => Math.max(0, p - 1))} />
          <Pressable style={{ flex: 1 }} onPress={() => setPhoto((p) => Math.min(photos.length - 1, p + 1))} />
        </View>
        <Pressable style={styles.info} onPress={() => router.push({ pathname: '/user/[id]', params: { id: user.id } })}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.name} numberOfLines={1}>{user.name}{user.age ? `, ${user.age}` : ''}</Text>
            {user.verified ? <VerifiedBadge size={20} /> : null}
            <View style={{ flex: 1 }} />
            <Icon name="arrowUp" size={18} color={colors.ink} />
          </View>
          <View style={{ flexDirection: 'row', gap: 5, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {user.isHost ? <HostBadge /> : null}
            <VipBadge tier={user.vipTier} />
            <LevelBadge kind="charm" level={user.charmLevel} />
            {user.city ? <Tag label={user.city} bg={colors.bgSunken} border={false} /> : null}
          </View>
          {user.bio ? <Text style={styles.bio} numberOfLines={2}>{user.bio}</Text> : null}
          {shared.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
              {shared.slice(0, 4).map((i) => <Tag key={i} label={t(`interests.${i}`)} icon="heart" bg={colors.brandSoft} />)}
            </View>
          ) : null}
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
            <Animated.View style={[styles.stamp, styles.stampSuper, { opacity: superOpacity }]}><Text style={[styles.stampText, { color: colors.white }]}>SUPER</Text></Animated.View>
          </Animated.View>
        ) : null}
      </View>
      {top ? (
        <View style={styles.actions}>
          <IconBtn name="close" size={58} sh={4} bg={colors.card} color={colors.ink} iconSize={30} onPress={() => fling('PASS')} />
          <IconBtn name="star" size={48} sh={3} bg={colors.diamond} color={colors.white} onPress={() => fling('SUPERLIKE')} />
          <IconBtn name="heart" size={70} sh={5} bg={colors.brand} color={colors.white} iconSize={34} onPress={() => fling('LIKE')} />
          <IconBtn name="gift" size={48} sh={3} bg={colors.coin} color={colors.ink} onPress={() => router.push({ pathname: '/user/[id]', params: { id: top.id, gift: '1' } })} />
          <IconBtn name="chat" size={58} sh={4} bg={colors.card} color={colors.ink} iconSize={26} onPress={() => router.push({ pathname: '/user/[id]', params: { id: top.id } })} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cardShadow: { position: 'absolute', left: 6, top: 6, right: -6, bottom: -6, borderRadius: radius.xl, backgroundColor: colors.ink },
  card: { flex: 1, borderRadius: radius.xl, overflow: 'hidden', borderWidth: 2.5, borderColor: colors.ink },
  bars: { position: 'absolute', top: 10, left: 12, right: 12, flexDirection: 'row', gap: 4 },
  bar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(23,18,15,0.35)' },
  topTags: { position: 'absolute', top: 24, left: 12, flexDirection: 'row', gap: 6 },
  tapZones: { ...StyleSheet.absoluteFill, flexDirection: 'row', bottom: '40%' },
  info: { position: 'absolute', left: 10, right: 10, bottom: 10, padding: 14, backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 2, borderColor: colors.ink },
  name: { color: colors.ink, fontSize: 24, fontFamily: fonts.display, letterSpacing: -0.8, flexShrink: 1 },
  bio: { color: colors.textMuted, marginTop: 8, fontSize: 14, fontFamily: fonts.regular, lineHeight: 19 },
  stamp: { position: 'absolute', top: 60, borderWidth: 3, borderColor: colors.ink, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 4 },
  stampLike: { left: 24, backgroundColor: colors.online, transform: [{ rotate: '-12deg' }] },
  stampNope: { right: 24, backgroundColor: colors.card, transform: [{ rotate: '12deg' }] },
  stampSuper: { alignSelf: 'center', top: undefined, bottom: 200, backgroundColor: colors.diamond },
  stampText: { fontSize: 30, fontFamily: fonts.display, letterSpacing: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 12 },
});
