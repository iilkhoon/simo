import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, fonts, radius, tintFor } from '@/theme';
import { Box, Btn, GlassPill, Header, IconBtn, Screen, T, Tabs } from '@/components/ui';
import { Illustration } from '@/components/Illustration';
import { Avatar } from '@/components/Avatar';
import { CoinAmount, CoinPill, LevelBadge, VerifiedBadge } from '@/components/Badges';
import { api } from '@/lib/api';
import { startCall } from '@/lib/calls';
import { useStore } from '@/store';
import type { PublicUser } from '@/lib/types';

type Kind = 'VIDEO' | 'VOICE';
type State = { s: 'search' } | { s: 'found'; user: PublicUser; price: number } | { s: 'none' };

/**
 * Təsadüfi tanışlıq (Azar/Sugo üslubu): onlayn və boş hostlardan biri seçilir,
 * istifadəçi "Keç" və ya "Zəng et" seçir. Zəng dəqiqəlik ödənişlidir.
 */
export default function Match() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ type?: string }>();
  const me = useStore((s) => s.me);
  const [kind, setKind] = useState<Kind>(params.type === 'VOICE' ? 'VOICE' : 'VIDEO');
  const [st, setSt] = useState<State>({ s: 'search' });
  const [calling, setCalling] = useState(false);
  const skip = useRef<string[]>([]);
  const pulse = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 1600, easing: Easing.out(Easing.quad), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const search = useCallback(async (k: Kind) => {
    setSt({ s: 'search' });
    const started = Date.now();
    try {
      const r = await api<{ user: PublicUser | null; price: number | null }>(`/calls/match?type=${k}&skip=${skip.current.slice(-40).join(',')}`);
      await new Promise((res) => setTimeout(res, Math.max(0, 1400 - (Date.now() - started))));
      if (!r.user) {
        setSt({ s: 'none' });
        return;
      }
      skip.current.push(r.user.id);
      pop.setValue(0);
      setSt({ s: 'found', user: r.user, price: r.price ?? 0 });
      Animated.spring(pop, { toValue: 1, friction: 6, useNativeDriver: true }).start();
    } catch {
      setSt({ s: 'none' });
    }
  }, [pop]);

  useEffect(() => {
    void search(kind);
  }, [kind, search]);

  async function call() {
    if (st.s !== 'found') return;
    setCalling(true);
    // Qiymət kartda artıq göstərilib — balans çatırsa birbaşa zəng
    await startCall(st.user.id, kind, { confirm: false });
    setCalling(false);
  }

  const video = kind === 'VIDEO';
  const accent = video ? colors.brand : colors.diamond;

  return (
    <Screen night edges={['top', 'bottom']}>
      <StatusBar style="light" />
      <Header night title={video ? t('live.quickVideo') : t('live.quickVoice')} right={<CoinPill n={me?.coins ?? 0} night onPress={() => router.push('/wallet')} />} />
      <Tabs<Kind> night value={kind} onChange={setKind} options={[{ key: 'VIDEO', label: t('match.video'), icon: 'videocam' }, { key: 'VOICE', label: t('match.voice'), icon: 'mic' }]} />

      <View style={styles.stage}>
        {st.s === 'search' ? (
          <View style={styles.center}>
            {[0, 1, 2].map((i) => (
              <Animated.View
                key={i}
                style={[styles.ring, { borderColor: accent, transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6 + i * 0.35, 1 + i * 0.35] }) }], opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0.15] }) }]}
              />
            ))}
            <View style={[styles.meDisc, { backgroundColor: accent }]}>
              <Avatar uri={me?.avatarUrl} name={me?.name} size={96} ring={false} />
            </View>
            <T v="h2" color={colors.white} center style={{ marginTop: 150 }}>{t('match.searching')}</T>
            <T v="small" color={colors.nightMuted} center>{t('match.searchingSub')}</T>
          </View>
        ) : st.s === 'none' ? (
          <View style={styles.center}>
            <Illustration name="search" size={150} />
            <T v="h2" color={colors.white} center style={{ marginTop: 18 }}>{t('match.none')}</T>
            <T v="small" color={colors.nightMuted} center style={{ marginTop: 4, maxWidth: 280 }}>{t('match.noneSub')}</T>
            <Btn full={false} kind="light" icon="refresh" title={t('common.retry')} style={{ marginTop: 18 }} onPress={() => void search(kind)} />
          </View>
        ) : (
          <Animated.View style={{ flex: 1, transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }], opacity: pop }}>
            <Box r={radius.xl} sh={0} bg={tintFor(st.user.name)} style={{ flex: 1 }} inner={{ flex: 1 }}>
              {(st.user.photos[0] ?? st.user.avatarUrl) ? <Image source={{ uri: st.user.photos[0] ?? st.user.avatarUrl! }} style={StyleSheet.absoluteFill} contentFit="cover" transition={160} /> : null}
              <LinearGradient colors={['rgba(16,14,13,0)', 'rgba(16,14,13,0.85)']} style={styles.scrim} pointerEvents="none" />
              <View style={styles.badges}>
                <GlassPill label={t('discover.activeNow')} icon="dot" bg={colors.online} />
                {st.user.distanceKm != null ? <GlassPill label={t('common.km', { n: st.user.distanceKm })} icon="location" /> : null}
              </View>
              <View style={styles.info}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.name} numberOfLines={1}>{st.user.name}{st.user.age ? `, ${st.user.age}` : ''}</Text>
                  {st.user.verified ? <VerifiedBadge size={20} /> : null}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                  <LevelBadge level={st.user.charmLevel} kind="charm" />
                  {st.user.city ? <GlassPill label={st.user.city} icon="location" bg={colors.glassLight} /> : null}
                  <View style={{ flex: 1 }} />
                  <View style={styles.price}>
                    <CoinAmount n={st.price} size={14} />
                    <Text style={styles.per}>/{t('match.min')}</Text>
                  </View>
                </View>
                {st.user.bio ? <T v="small" color="rgba(255,255,255,0.85)" numberOfLines={2} style={{ marginTop: 6 }}>{st.user.bio}</T> : null}
              </View>
            </Box>
          </Animated.View>
        )}
      </View>

      {st.s === 'found' ? (
        <View>
        <T v="tiny" color={colors.nightMuted} center numberOfLines={1} style={{ marginBottom: 10 }}>{t('match.billing')}</T>
        <View style={styles.actions}>
          <View style={styles.col}>
            <IconBtn name="shuffle" size={56} sh={0} bg={colors.glassLight} color={colors.white} onPress={() => void search(kind)} />
            <T v="tiny" color={colors.nightMuted}>{t('match.next')}</T>
          </View>
          <View style={[styles.col, { flex: 1, alignItems: 'stretch' }]}>
            <Btn kind={video ? 'primary' : 'diamond'} icon={video ? 'videocam' : 'call'} title={t('match.call')} loading={calling} onPress={call} />
          </View>
          <View style={styles.col}>
            <IconBtn name="person" size={56} sh={0} bg={colors.glassLight} color={colors.white} onPress={() => router.push({ pathname: '/user/[id]', params: { id: st.user.id } })} />
            <T v="tiny" color={colors.nightMuted}>{t('match.profile')}</T>
          </View>
        </View>
        </View>
      ) : (
        <View style={{ height: 24 }} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, marginTop: 16, marginBottom: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 160, height: 160, borderRadius: 80, borderWidth: 2 },
  meDisc: { position: 'absolute', width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center' },
  badges: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', gap: 6 },
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '55%' },
  info: { position: 'absolute', left: 18, right: 18, bottom: 18 },
  name: { fontFamily: fonts.display, fontSize: 30, letterSpacing: -1, color: colors.white, flexShrink: 1 },
  price: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.coin, borderRadius: 14, paddingHorizontal: 10, height: 28 },
  per: { fontFamily: fonts.bold, fontSize: 12, color: colors.ink },
  actions: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingTop: 6, paddingBottom: 8 },
  col: { alignItems: 'center', gap: 6, minWidth: 64 },
});
