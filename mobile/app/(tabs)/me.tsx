import React, { useCallback } from 'react';
import { useTabSpace } from '@/components/Glass';
import { Share, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, fonts, vipColor } from '@/theme';
import { Card, IconBtn, MenuRow, PressBox, Screen, T } from '@/components/ui';
import { Burst } from '@/components/Burst';
import { Avatar } from '@/components/Avatar';
import { CoinAmount, DiamondAmount, HostBadge, LevelBadge, VerifiedBadge, VipBadge } from '@/components/Badges';
import { Icon } from '@/components/Icon';
import { useStore } from '@/store';
import { dateOnly } from '@/lib/format';
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
        <View style={[styles.fill, { width: `${Math.max(6, pct * 100)}%`, backgroundColor: color }]} />
      </View>
    </View>
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

      {/* Balanslar */}
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
        <PressBox style={{ flex: 1 }} r={22} sh={0} bg={colors.coin} onPress={() => router.push('/wallet')} inner={styles.balance}>
          <T v="label">{t('common.coins')}</T>
          <CoinAmount n={me.coins.toLocaleString('en-US')} size={24} />
          <View style={styles.cta}><Text style={styles.ctaText}>{t('wallet.recharge')}</Text><Icon name="arrowRight" size={13} color={colors.bg} /></View>
          {!me.firstRechargeDone ? <View style={styles.x2}><Burst size={48} color={colors.brand} points={10} /><Text style={styles.x2Text}>+300</Text></View> : null}
        </PressBox>
        <PressBox style={{ flex: 1 }} r={22} sh={0} bg={colors.diamondSoft} onPress={() => router.push('/earnings')} inner={styles.balance}>
          <T v="label">{t('common.diamonds')}</T>
          <DiamondAmount n={me.diamonds.toLocaleString('en-US')} size={24} />
          <View style={styles.cta}><Text style={styles.ctaText}>{t('me.earnings')}</Text><Icon name="arrowRight" size={13} color={colors.bg} /></View>
        </PressBox>
      </View>

      {/* VIP */}
      <PressBox style={{ marginTop: 12 }} r={22} sh={0} bg={me.vip ? vipColor(me.vip.tier).bg : colors.ink} onPress={() => router.push('/vip')} inner={styles.vip}>
        <View style={[styles.vipIcon, { backgroundColor: me.vip ? colors.card : colors.coin }]}><Icon name="crown" size={22} color={colors.ink} /></View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.vipTitle, { color: me.vip ? vipColor(me.vip.tier).fg : colors.bg }]}>{t('vip.title')}</Text>
          <Text style={[styles.vipSub, { color: me.vip ? vipColor(me.vip.tier).fg : colors.nightMuted }]} numberOfLines={2}>
            {me.vip && me.vipUntil ? t('vip.activeUntil', { tier: t(`vip.tiers.${me.vip.tier}`), date: dateOnly(me.vipUntil) }) : t('vip.subtitle')}
          </Text>
        </View>
        <Icon name="chevron" size={18} color={me.vip ? vipColor(me.vip.tier).fg : colors.bg} />
      </PressBox>

      {!isHost ? (
        <PressBox style={{ marginTop: 12 }} r={22} sh={0} bg={colors.highlight} onPress={() => router.push('/host-tasks')} inner={styles.vip}>
          <View style={[styles.vipIcon, { backgroundColor: colors.card }]}><Icon name="sparkles" size={20} color={colors.ink} /></View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.vipTitle, { color: colors.ink }]}>{me.hostStatus === 'PENDING' ? t('me.hostPending') : t('me.becomeHost')}</Text>
            <Text style={[styles.vipSub, { color: colors.textMuted }]}>{t('me.hostPitch')}</Text>
          </View>
          <Icon name="chevron" size={18} color={colors.ink} />
        </PressBox>
      ) : null}

      <Card style={{ marginTop: 16 }}>
        <MenuRow icon="heart" label={t('me.likes')} tint={colors.brandSoft} onPress={() => router.push('/likes')} />
        <MenuRow icon="eye" label={t('me.visitors')} tint={colors.lilac} onPress={() => router.push('/visitors')} />
        <MenuRow icon="gift" label={t('me.rewards')} tint={colors.coinSoft} onPress={() => router.push('/rewards')} />
        <MenuRow icon="trophy" label={t('me.leaderboard')} tint={colors.highlight} onPress={() => router.push('/leaderboard')} />
        <MenuRow icon="crown" label={t('noble.title')} tint={colors.coinSoft} onPress={() => router.push('/noble')} />
        <MenuRow icon="sparkles" label={t('raffles.title')} tint={colors.lilac} onPress={() => router.push('/raffles')} last />
      </Card>
      <Card style={{ marginTop: 12 }}>
        {isHost || me.diamonds > 0 ? <MenuRow icon="cash" label={t('me.earnings')} tint={colors.diamondSoft} onPress={() => router.push('/earnings')} /> : null}
        <MenuRow icon="business" label={t('me.agency')} tint={colors.lilac} value={me.agency?.name ?? me.ownedAgency?.name} onPress={() => router.push('/agency')} />
        <MenuRow icon="search" label={t('agency.browse')} tint={colors.skySoft} onPress={() => router.push('/agencies')} />
        <MenuRow icon="shield" label={t('kyc.title')} tint={colors.onlineSoft} value={t(`kyc.status.${me.kycStatus ?? 'NONE'}`)} onPress={() => router.push('/verify')} />
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { padding: 16 },
  track: { height: 12, borderRadius: 6, backgroundColor: colors.bgSunken, overflow: 'hidden' },
  fill: { height: '100%', borderRightWidth: 1, borderColor: colors.hairline },
  balance: { padding: 14, gap: 8, minHeight: 116 },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: colors.ink, borderRadius: 10, paddingHorizontal: 9, height: 24 },
  ctaText: { color: colors.bg, fontFamily: fonts.bold, fontSize: 11.5 },
  x2: { position: 'absolute', top: 8, right: 8, width: 48, height: 48, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '12deg' }] },
  x2Text: { position: 'absolute', color: colors.white, fontFamily: fonts.display, fontSize: 13 },
  vip: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  vipIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  vipTitle: { fontFamily: fonts.displayBold, fontSize: 15 },
  vipSub: { fontFamily: fonts.medium, fontSize: 12, marginTop: 2 },
});
