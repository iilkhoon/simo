import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { colors, fonts, radius } from '@/theme';
import { Btn, Loader, T, tap } from '@/components/ui';
import { Avatar } from '@/components/Avatar';
import { VerifiedBadge } from '@/components/Badges';
import { CoinIcon, DiamondIcon } from '@/components/GiftIcon';
import { Icon } from '@/components/Icon';
import { GiftSheet } from '@/components/GiftSheet';
import { api } from '@/lib/api';
import { startCall } from '@/lib/calls';
import { fmtAlmaz } from '@/lib/economy';
import { duration } from '@/lib/format';
import type { PublicUser } from '@/lib/types';

interface Summary {
  call: { id: string; type: 'VIDEO' | 'VOICE'; status: string; endReason: string | null; pricePerMin: number; billedMinutes: number };
  role: 'caller' | 'callee';
  durationSec: number; coinsSpent: number; earned: number; giftsCoins: number; giftsDiamonds: number;
  peer: PublicUser; isFollowing: boolean; myRating: number | null;
}

/**
 * Zəngdən sonrakı xülasə (Chamet / LivU üslubu): müddət, xərclənən Nar (və ya hostun qazancı),
 * 1–5 ulduz qiymət, izlə / hədiyyə / yaz / yenidən zəng et.
 */
export default function CallSummary() {
  const { t } = useTranslation();
  const { id, reason } = useLocalSearchParams<{ id: string; reason?: string }>();
  const [s, setS] = useState<Summary | null>(null);
  const [stars, setStars] = useState(0);
  const [following, setFollowing] = useState(false);
  const [giftOpen, setGiftOpen] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    api<Summary>(`/calls/${id}/summary`)
      .then((r) => { setS(r); setStars(r.myRating ?? 0); setFollowing(r.isFollowing); })
      .catch(() => setFailed(true));
  }, [id]);

  function done() {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  }

  function rate(n: number) {
    tap();
    setStars(n);
    void api(`/calls/${id}/rate`, { body: { stars: n } }).catch(() => {});
  }

  async function follow() {
    if (!s) return;
    setFollowing(true);
    await api(`/users/${s.peer.id}/follow`, { body: {} }).catch(() => setFollowing(false));
  }

  async function message() {
    if (!s) return;
    try {
      const r = await api<{ id: string }>(`/conversations/with/${s.peer.id}`, { body: {} });
      router.replace({ pathname: '/chat/[id]', params: { id: r.id } });
    } catch {
      /* ignore */
    }
  }

  if (failed) {
    return (
      <View style={styles.root}>
        <SafeAreaView style={[styles.wrap, { justifyContent: 'center' }]}>
          <T v="h2" color={colors.white} center>{t('call.ended')}</T>
          <Btn kind="light" title={t('cl.done')} onPress={done} style={{ marginTop: 20 }} />
        </SafeAreaView>
      </View>
    );
  }
  if (!s) return <View style={styles.root}><Loader full night /></View>;
  const caller = s.role === 'caller';
  const video = s.call.type === 'VIDEO';
  const why = reason || s.call.endReason;
  const reasonText = why && why !== 'HANGUP' ? t(`call.reasons.${why}`, { defaultValue: '' }) : '';

  const stats: { label: string; value: React.ReactNode; bg: string }[] = [
    { label: t('cl.summaryDuration'), value: <Text style={styles.statNum}>{duration(s.durationSec)}</Text>, bg: 'rgba(255,255,255,0.08)' },
  ];
  if (caller && s.call.pricePerMin > 0) {
    stats.push({ label: t('cl.summarySpent'), value: <View style={styles.row}><CoinIcon size={18} /><Text style={styles.statNum}>{s.coinsSpent + s.giftsCoins}</Text></View>, bg: 'rgba(255,196,0,0.16)' });
  }
  if (!caller && (s.earned > 0 || s.giftsDiamonds > 0)) {
    stats.push({ label: t('cl.summaryEarned'), value: <View style={styles.row}><DiamondIcon size={18} /><Text style={styles.statNum}>{fmtAlmaz(s.earned + s.giftsDiamonds)}</Text></View>, bg: 'rgba(80,170,255,0.16)' });
  }
  if (s.giftsCoins > 0 && caller) {
    stats.push({ label: t('cl.summaryGifts'), value: <View style={styles.row}><Icon name="gift" size={18} color={colors.coin} /><Text style={styles.statNum}>{s.giftsCoins}</Text></View>, bg: 'rgba(255,255,255,0.08)' });
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      {s.peer.avatarUrl ? <Image source={{ uri: s.peer.avatarUrl }} style={[StyleSheet.absoluteFill, { opacity: 0.3 }]} contentFit="cover" blurRadius={50} /> : null}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(16,14,13,0.6)' }]} />
      <SafeAreaView style={styles.wrap} edges={['top', 'bottom']}>
        <View style={{ alignItems: 'flex-end' }}>
          <Pressable onPress={done} hitSlop={12} style={styles.close}><Icon name="close" size={22} color={colors.white} /></Pressable>
        </View>
        <View style={{ alignItems: 'center', marginTop: 6 }}>
          <Avatar uri={s.peer.avatarUrl} name={s.peer.name} size={96} />
          <View style={[styles.row, { marginTop: 14 }]}>
            <Text style={styles.name} numberOfLines={1}>{s.peer.name}</Text>
            {s.peer.verified ? <VerifiedBadge size={20} /> : null}
          </View>
          <View style={[styles.row, { marginTop: 6 }]}>
            <Icon name={video ? 'videocam' : 'call'} size={15} color={colors.nightMuted} />
            <Text style={styles.sub}>{s.durationSec > 0 ? t('cl.summaryTitle') : t('cl.notConnected')}{reasonText ? ` · ${reasonText}` : ''}</Text>
          </View>
        </View>

        <View style={styles.stats}>
          {stats.map((x) => (
            <View key={x.label} style={[styles.stat, { backgroundColor: x.bg }]}>
              {x.value}
              <Text style={styles.statLabel}>{x.label}</Text>
            </View>
          ))}
        </View>

        {s.durationSec > 0 ? (
          <View style={styles.rateBox}>
            <Text style={styles.rateQ}>{stars ? t('cl.rated') : caller ? t('cl.rateQ') : t('cl.rateHostQ')}</Text>
            <View style={[styles.row, { gap: 10, marginTop: 10 }]}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable key={n} onPress={() => rate(n)} hitSlop={6} accessibilityRole="button" accessibilityLabel={`${n}`}>
                  <Icon name="star" size={34} color={n <= stars ? colors.coin : 'rgba(255,255,255,0.22)'} />
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        <View style={{ flex: 1 }} />

        <View style={styles.actions}>
          <Action icon={following ? 'checkmark' : 'add'} label={following ? t('cl.following') : t('cl.follow')} onPress={following ? undefined : () => void follow()} />
          {caller ? <Action icon="gift" label={t('cl.sendGift')} tint={colors.coin} onPress={() => setGiftOpen(true)} /> : null}
          <Action icon="chat" label={t('cl.message')} onPress={() => void message()} />
        </View>
        {caller ? (
          <Btn
            kind={video ? 'primary' : 'diamond'}
            icon={video ? 'videocam' : 'call'}
            title={t('cl.callAgain')}
            style={{ marginTop: 16 }}
            onPress={() => { router.back(); void startCall(s.peer.id, s.call.type, { confirm: false }); }}
          />
        ) : null}
        <Btn kind="light" title={t('cl.done')} style={{ marginTop: 10 }} onPress={done} />
      </SafeAreaView>
      {caller ? <GiftSheet visible={giftOpen} onClose={() => setGiftOpen(false)} receiverId={s.peer.id} receiverName={s.peer.name} context="PROFILE" /> : null}
    </View>
  );
}

function Action({ icon, label, onPress, tint }: { icon: React.ComponentProps<typeof Icon>['name']; label: string; onPress?: () => void; tint?: string }) {
  return (
    <Pressable onPress={() => { tap(); onPress?.(); }} disabled={!onPress} style={({ pressed }) => [styles.action, pressed && { opacity: 0.7 }]}>
      <View style={[styles.actionDisc, tint ? { backgroundColor: tint } : null]}>
        <Icon name={icon} size={22} color={tint ? colors.ink : colors.white} />
      </View>
      <Text style={styles.actionLabel} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.night },
  wrap: { flex: 1, paddingHorizontal: 20, paddingBottom: 12 },
  close: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.glassLight, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { color: colors.white, fontFamily: fonts.display, fontSize: 28, letterSpacing: -0.8, maxWidth: 260 },
  sub: { color: colors.nightMuted, fontFamily: fonts.semibold, fontSize: 13.5 },
  stats: { flexDirection: 'row', gap: 10, marginTop: 26, justifyContent: 'center' },
  stat: { flex: 1, maxWidth: 160, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', gap: 4 },
  statNum: { color: colors.white, fontFamily: fonts.black, fontSize: 20 },
  statLabel: { color: colors.nightMuted, fontFamily: fonts.semibold, fontSize: 12 },
  rateBox: { alignItems: 'center', marginTop: 26, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: radius.lg, paddingVertical: 18 },
  rateQ: { color: colors.white, fontFamily: fonts.bold, fontSize: 15 },
  actions: { flexDirection: 'row', justifyContent: 'space-evenly' },
  action: { alignItems: 'center', gap: 6, width: 90 },
  actionDisc: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.glassLight, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { color: colors.nightText, fontFamily: fonts.bold, fontSize: 12 },
});
