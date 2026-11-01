import React, { useCallback } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, font, gradients, radius } from '@/theme';
import { Card, MenuRow, Screen } from '@/components/ui';
import { Avatar } from '@/components/Avatar';
import { CoinAmount, DiamondAmount, HostBadge, LevelBadge, VerifiedBadge, VipBadge } from '@/components/Badges';
import { Icon } from '@/components/Icon';
import { useStore } from '@/store';
import { WEB_URL } from '@/config';

function Progress({ label, level, xp, next, color }: { label: string; level: number; xp: number; next: number; color: readonly [string, string] }) {
  const prev = level * level * 50;
  const pct = Math.min(1, Math.max(0, (xp - prev) / Math.max(1, next - prev)));
  return (
    <View style={{ flex: 1, gap: 6 }}>
      <Text style={font.tiny}>{label} · Lv.{level}</Text>
      <View style={styles.track}>
        <LinearGradient colors={color} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.fill, { width: `${pct * 100}%` }]} />
      </View>
    </View>
  );
}

export default function MeTab() {
  const { t } = useTranslation();
  const { me, refreshMe, unreadNotifications } = useStore();

  useFocusEffect(
    useCallback(() => {
      void refreshMe();
    }, [refreshMe]),
  );

  if (!me) return <Screen><View /></Screen>;
  const isHost = me.hostStatus === 'APPROVED';

  return (
    <Screen scroll>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
        <Pressable onPress={() => router.push('/notifications')} style={styles.iconBtn}>
          <Icon name="bell" size={20} />
          {unreadNotifications ? <View style={styles.dot} /> : null}
        </Pressable>
        <Pressable onPress={() => router.push('/settings')} style={styles.iconBtn}><Icon name="settings" size={20} /></Pressable>
      </View>

      <Pressable onPress={() => router.push({ pathname: '/user/[id]', params: { id: me.id } })} style={styles.head}>
        <Avatar uri={me.avatarUrl} name={me.name} size={86} vipTier={me.vipTier} />
        <View style={{ flex: 1, gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={font.h2} numberOfLines={1}>{me.name}</Text>
            {me.verified ? <VerifiedBadge size={18} /> : null}
          </View>
          <Text style={font.small}>{t('common.id', { id: me.shortId })}{me.age ? ` · ${t('common.years', { n: me.age })}` : ''}</Text>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            {isHost ? <HostBadge /> : null}
            <VipBadge tier={me.vipTier} />
            <LevelBadge kind="wealth" level={me.wealth.level} />
            <LevelBadge kind="charm" level={me.charm.level} />
          </View>
        </View>
        <Pressable onPress={() => router.push('/edit-profile')} style={styles.edit}><Icon name="more" size={18} /></Pressable>
      </Pressable>

      <View style={{ flexDirection: 'row', gap: 16, marginVertical: 14 }}>
        <Progress label={t('me.wealth')} level={me.wealth.level} xp={me.wealth.xp} next={me.wealth.next} color={['#FFB86B', '#F2711C']} />
        <Progress label={t('me.charm')} level={me.charm.level} xp={me.charm.xp} next={me.charm.next} color={['#FF8FB8', '#C850C0']} />
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Pressable style={{ flex: 1 }} onPress={() => router.push('/wallet')}>
          <LinearGradient colors={['#3B2410', '#24140A']} style={styles.balance}>
            <Text style={font.small}>Simo Coin</Text>
            <CoinAmount n={me.coins} size={24} />
            <Text style={styles.balanceCta}>{t('wallet.recharge')} ›</Text>
            {!me.firstRechargeDone ? <View style={styles.x2}><Text style={styles.x2Text}>×2</Text></View> : null}
          </LinearGradient>
        </Pressable>
        <Pressable style={{ flex: 1 }} onPress={() => router.push('/earnings')}>
          <LinearGradient colors={['#10273B', '#0A1624']} style={styles.balance}>
            <Text style={font.small}>Simo Almaz</Text>
            <DiamondAmount n={me.diamonds} size={24} />
            <Text style={[styles.balanceCta, { color: colors.diamond }]}>{t('me.earnings')} ›</Text>
          </LinearGradient>
        </Pressable>
      </View>

      <Pressable onPress={() => router.push('/vip')} style={{ marginTop: 12 }}>
        <LinearGradient colors={me.vip ? gradients.vipGold : gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.vip}>
          <Icon name="crown" size={26} color={me.vip ? '#3A1F00' : '#fff'} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: me.vip ? '#3A1F00' : '#fff', fontWeight: '900', fontSize: 16 }}>{t('vip.title')}</Text>
            <Text style={{ color: me.vip ? '#3A1F00' : '#fff', opacity: 0.85, fontSize: 12 }}>
              {me.vip && me.vipUntil ? t('vip.activeUntil', { tier: t(`vip.tiers.${me.vip.tier}`), date: new Date(me.vipUntil).toLocaleDateString() }) : t('vip.subtitle')}
            </Text>
          </View>
          <Icon name="chevron" size={18} color={me.vip ? '#3A1F00' : '#fff'} />
        </LinearGradient>
      </Pressable>

      {!isHost && me.gender === 'FEMALE' ? (
        <Pressable onPress={() => router.push('/host-apply')} style={{ marginTop: 12 }}>
          <LinearGradient colors={['#FF8A65', '#FF4D8D']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.vip}>
            <Text style={{ fontSize: 24 }}>💰</Text>
            <Text style={{ color: '#fff', fontWeight: '800', flex: 1 }}>{me.hostStatus === 'PENDING' ? t('me.hostPending') : t('me.becomeHost')}</Text>
            <Icon name="chevron" size={18} />
          </LinearGradient>
        </Pressable>
      ) : null}

      <Card style={{ marginTop: 14 }}>
        <MenuRow icon="heart" label={t('me.likes')} onPress={() => router.push('/likes')} />
        <MenuRow icon="eye" label={t('me.visitors')} color={colors.violet} onPress={() => router.push('/visitors')} />
        <MenuRow icon="gift" label={t('me.rewards')} color={colors.gold} onPress={() => router.push('/rewards')} />
        <MenuRow icon="trophy" label={t('me.leaderboard')} color={colors.peach} onPress={() => router.push('/leaderboard')} />
      </Card>
      <Card style={{ marginTop: 12 }}>
        {isHost || me.diamonds > 0 ? <MenuRow icon="cash" label={t('me.earnings')} color={colors.diamond} onPress={() => router.push('/earnings')} /> : null}
        <MenuRow icon="business" label={t('me.agency')} color={colors.orchid} value={me.agency?.name ?? me.ownedAgency?.name} onPress={() => router.push('/agency')} />
        <MenuRow icon="video" label={t('me.myVideos')} color={colors.rose} onPress={() => router.push({ pathname: '/user/[id]', params: { id: me.id } })} />
        <MenuRow
          icon="share"
          label={t('me.invite')}
          color={colors.online}
          onPress={() => void Share.share({ message: t('rewards.inviteShare', { code: String(me.shortId), url: WEB_URL }) })}
        />
        <MenuRow icon="settings" label={t('me.settings')} color={colors.textMuted} onPress={() => router.push('/settings')} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  iconBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', top: 7, right: 8, width: 9, height: 9, borderRadius: 5, backgroundColor: colors.rose },
  head: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 6 },
  edit: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.surface2, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  balance: { padding: 14, borderRadius: radius.lg, gap: 6, borderWidth: 1, borderColor: colors.border, minHeight: 104 },
  balanceCta: { color: colors.gold, fontWeight: '700', fontSize: 13 },
  x2: { position: 'absolute', top: 10, right: 10, backgroundColor: colors.rose, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  x2Text: { color: '#fff', fontWeight: '900', fontSize: 12 },
  vip: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: radius.lg },
});
