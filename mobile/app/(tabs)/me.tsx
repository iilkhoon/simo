import React, { useCallback, useEffect } from 'react';
import { useTabSpace } from '@/components/Glass';
import { Share, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';
import { colors, fonts, gradients, motion, vipColor } from '@/theme';
import { Card, GradientCard, IconBtn, MenuRow, PressBox, Screen, T } from '@/components/ui';
import { Illustration } from '@/components/Illustration';
import { Appear } from '@/components/motion';
import { Avatar } from '@/components/Avatar';
import { CoinAmount, DiamondAmount, HostBadge, LevelBadge, VerifiedBadge, VipBadge } from '@/components/Badges';
import { Icon } from '@/components/Icon';
import { useStore } from '@/store';
import { dateOnly, big } from '@/lib/format';
import { WEB_URL } from '@/config';

function Progress({ label, level, xp, next, color }: { label: string; level: number; xp: number; next: number; color: string }) {
  const prev = level * level * 50;
  const pct = Math.min(1, Math.max(0, (xp - prev) / Math.max(1, next - prev)));
  return (
    <View style={{ flex: 1, gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <T v="label" color={colors.textMuted}>{label}</T>
        <T v="label">Lv {level}</T>
      </View>
      <View style={styles.track}>
        <Fill pct={Math.max(0.06, pct)} g={color === colors.coin ? gradients.gold : gradients.nar} />
      </View>
    </View>
  );
}

/** Səviyyə zolağı — açılanda yay ilə dolur */
function Fill({ pct, g }: { pct: number; g: readonly [string, string, ...string[]] }) {
  const v = useSharedValue(0);
  useEffect(() => { v.value = withDelay(250, withSpring(pct, motion.enter)); }, [pct, v]);
  const a = useAnimatedStyle(() => ({ width: `${v.value * 100}%` }));
  return (
    <Animated.View style={[styles.fill, a]}>
      <LinearGradient colors={g} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
    </Animated.View>
  );
}

export default function MeTab() {
  const { t } = useTranslation();
  const tabSpace = useTabSpace();
  const { me, refreshMe, unreadNotifications } = useStore();

  useFocusEffect(
    useCallback(() => {
      void refreshMe();
    }, [refreshMe]),
  );

  if (!me) return <Screen><View /></Screen>;
  const isHost = me.hostStatus === 'APPROVED';

  return (
    <Screen scroll bottom={tabSpace}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 6, paddingBottom: 12, minHeight: 54 }}>
        <T v="h1" style={{ flex: 1 }}>{t('tabs.me')}</T>
        <IconBtn name="bell" size={40} badge={unreadNotifications} onPress={() => router.push('/notifications')} />
        <IconBtn name="settings" size={40} onPress={() => router.push('/settings')} />
      </View>

      {/* Profil kartı */}
      <Appear i={0}>
      <PressBox r={24} sh={2} onPress={() => router.push({ pathname: '/user/[id]', params: { id: me.id } })} inner={styles.head}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Avatar uri={me.avatarUrl} name={me.name} size={78} vipTier={me.vipTier} />
          <View style={{ flex: 1, gap: 5 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <T v="h2" numberOfLines={1} style={{ flexShrink: 1 }}>{me.name}</T>
              {me.verified ? <VerifiedBadge size={18} /> : null}
            </View>
            <T v="small" color={colors.textMuted}>{t('common.id', { id: me.shortId })}{me.age ? ` · ${t('common.years', { n: me.age })}` : ''}</T>
            <View style={{ flexDirection: 'row', gap: 5, flexWrap: 'wrap' }}>
              {isHost ? <HostBadge /> : null}
              <VipBadge tier={me.vipTier} />
              <LevelBadge kind="wealth" level={me.wealth.level} />
              <LevelBadge kind="charm" level={me.charm.level} />
            </View>
          </View>
          <IconBtn name="more" size={36} sh={0} bg={colors.bgSunken} onPress={() => router.push('/edit-profile')} />
        </View>
        <View style={{ flexDirection: 'row', gap: 16, marginTop: 16 }}>
          <Progress label={t('me.wealth')} level={me.wealth.level} xp={me.wealth.xp} next={me.wealth.next} color={colors.coin} />
          <Progress label={t('me.charm')} level={me.charm.level} xp={me.charm.xp} next={me.charm.next} color={colors.brand} />
        </View>
      </PressBox>
      </Appear>

      {/* Balanslar */}
      <Appear i={1} style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
        <GradientCard g="gold" glow={colors.white} style={{ flex: 1 }} r={24} inner={styles.balance} onPress={() => router.push('/wallet')}>
          <T v="label" color="rgba(26,21,18,0.7)">{t('common.coins')}</T>
          <CoinAmount n={big(me.coins)} size={24} />
          <View style={styles.cta}><Text style={styles.ctaText}>{t('wallet.recharge')}</Text><Icon name="arrowRight" size={13} color={colors.bg} /></View>
          {!me.firstRechargeDone ? <View style={styles.x2}><Icon name="gift" size={11} color={colors.white} /><Text style={styles.x2Text}>+300</Text></View> : null}
        </GradientCard>
        <GradientCard g="diamond" glow={colors.white} style={{ flex: 1 }} r={24} inner={styles.balance} onPress={() => router.push('/earnings')}>
          <T v="label" color="rgba(255,255,255,0.8)">{t('common.diamonds')}</T>
          <DiamondAmount n={me.diamonds} size={24} color={colors.white} />
          <View style={[styles.cta, { backgroundColor: colors.white }]}><Text style={[styles.ctaText, { color: colors.ink }]}>{t('me.earnings')}</Text><Icon name="arrowRight" size={13} color={colors.ink} /></View>
        </GradientCard>
      </Appear>

      {/* VIP */}
      <Appear i={2}>
        <GradientCard g={me.vip ? (me.vip.tier === 'DIAMOND' ? 'diamond' : me.vip.tier === 'GOLD' ? 'gold' : ['#F4F6FA', '#C9D1DC']) : 'night'} glow={me.vip ? colors.white : colors.coin} shine style={{ marginTop: 12 }} r={24} inner={styles.vip} onPress={() => router.push('/vip')}>
          <View style={styles.vipArt}><Illustration name="crown" bare size={44} float={false} /></View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.vipTitle, { color: me.vip ? vipColor(me.vip.tier).fg : colors.bg }]}>{t('vip.title')}</Text>
            <Text style={[styles.vipSub, { color: me.vip ? vipColor(me.vip.tier).fg : colors.nightMuted }]} numberOfLines={2}>
              {me.vip && me.vipUntil ? t('vip.activeUntil', { tier: t(`vip.tiers.${me.vip.tier}`), date: dateOnly(me.vipUntil) }) : t('vip.subtitle')}
            </Text>
          </View>
          <View style={[styles.go, { backgroundColor: me.vip ? 'rgba(255,255,255,0.35)' : colors.coin }]}><Icon name="chevron" size={16} color={colors.ink} /></View>
        </GradientCard>
      </Appear>

      {!isHost ? (
        <Appear i={3}>
          <GradientCard g="lime" sh={1} style={{ marginTop: 12 }} r={24} inner={styles.vip} onPress={() => router.push('/host-tasks')}>
            <View style={[styles.vipIcon, { backgroundColor: colors.card }]}><Icon name="mic" size={20} color={colors.ink} /></View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.vipTitle, { color: colors.ink }]}>{me.hostStatus === 'PENDING' ? t('me.hostPending') : t('me.becomeHost').replace(/\s*\p{Extended_Pictographic}/gu, '')}</Text>
              <Text style={[styles.vipSub, { color: colors.textMuted }]}>{t('me.hostPitch')}</Text>
            </View>
            <View style={[styles.go, { backgroundColor: colors.ink }]}><Icon name="chevron" size={16} color={colors.white} /></View>
          </GradientCard>
        </Appear>
      ) : null}

      <Appear i={4}>
      <Card style={{ marginTop: 16 }}>
        <MenuRow icon="heart" label={t('me.likes')} tint={colors.brandSoft} onPress={() => router.push('/likes')} />
        <MenuRow icon="eye" label={t('me.visitors')} tint={colors.lilac} onPress={() => router.push('/visitors')} />
        <MenuRow icon="gift" label={t('me.rewards')} tint={colors.coinSoft} onPress={() => router.push('/rewards')} />
        <MenuRow icon="trophy" label={t('me.leaderboard')} tint={colors.highlight} onPress={() => router.push('/leaderboard')} />
        <MenuRow icon="crown" label={t('noble.title')} tint={colors.coinSoft} onPress={() => router.push('/noble')} />
        <MenuRow icon="ticket" label={t('raffles.title')} tint={colors.lilac} onPress={() => router.push('/raffles')} last />
      </Card>
      </Appear>
      <Appear i={5}>
      <Card style={{ marginTop: 12 }}>
        {isHost || me.diamonds > 0 ? <MenuRow icon="cash" label={t('me.earnings')} tint={colors.diamondSoft} onPress={() => router.push('/earnings')} /> : null}
        <MenuRow icon="business" label={t('me.agency')} tint={colors.lilac} value={me.agency?.name ?? me.ownedAgency?.name} onPress={() => router.push('/agency')} />
        <MenuRow icon="search" label={t('agency.browse')} tint={colors.skySoft} onPress={() => router.push('/agencies')} />
        <MenuRow icon="shield" label={t('kyc.title')} tint={colors.onlineSoft} value={t(`kyc.status.${me.kycStatus ?? 'NONE'}`)} onPress={() => router.push('/verify')} />
        <MenuRow icon="cart" label={t('menu2.services')} tint={colors.highlight} onPress={() => router.push('/services')} />
        <MenuRow icon="receipt" label={t('menu2.orders')} tint={colors.skySoft} onPress={() => router.push('/orders')} />
        <MenuRow icon="call" label={t('menu2.callSettings')} tint={colors.brandSoft} value={t(`callSettings.presence.${me.presenceSetting ?? 'AUTO'}`)} onPress={() => router.push('/call-settings')} />
        <MenuRow icon="bell" label={t('menu2.notifSettings')} tint={colors.lilac} onPress={() => router.push('/notif-settings')} />
        <MenuRow icon="bookmark" label={t('me.saved')} tint={colors.coinSoft} onPress={() => router.push('/saved')} />
        <MenuRow icon="video" label={t('me.myVideos')} tint={colors.brandSoft} onPress={() => router.push({ pathname: '/user/[id]', params: { id: me.id } })} />
        <MenuRow
          icon="share"
          label={t('me.invite')}
          tint={colors.onlineSoft}
          onPress={() => void Share.share({ message: t('rewards.inviteShare', { code: String(me.shortId), url: WEB_URL }) })}
        />
        <MenuRow icon="settings" label={t('me.settings')} tint={colors.bgSunken} onPress={() => router.push('/settings')} last />
      </Card>
      </Appear>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { padding: 16 },
  track: { height: 10, borderRadius: 5, backgroundColor: colors.bgSunken, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5, overflow: 'hidden' },
  balance: { padding: 14, gap: 8, minHeight: 116 },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: colors.ink, borderRadius: 10, paddingHorizontal: 9, height: 24 },
  ctaText: { color: colors.bg, fontFamily: fonts.bold, fontSize: 11.5 },
  x2: { position: 'absolute', top: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 3, height: 22, paddingHorizontal: 8, borderRadius: 11, backgroundColor: colors.brand },
  x2Text: { color: colors.white, fontFamily: fonts.black, fontSize: 11 },
  vipArt: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  go: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  vip: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  vipIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  vipTitle: { fontFamily: fonts.displayBold, fontSize: 15 },
  vipSub: { fontFamily: fonts.medium, fontSize: 12, marginTop: 2 },
});
