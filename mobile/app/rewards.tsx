import React, { useState } from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, font, fonts, gradients, radius } from '@/theme';
import { Btn, Card, Header, Screen, Tag } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { Appear } from '@/components/motion';
import { CoinIcon } from '@/components/GiftIcon';
import { api } from '@/lib/api';
import { errorText } from '@/lib/format';
import { useStore } from '@/store';
import { WEB_URL } from '@/config';
import type { Me } from '@/lib/types';

export default function Rewards() {
  const [gridW, setGridW] = useState(0);
  const cellW = gridW ? (gridW - GAP * 3) / 4 : 70;
  const { t } = useTranslation();
  const { me, setMe, toast } = useStore();
  const [busy, setBusy] = useState(false);
  if (!me) return null;
  const { streak, doneToday, rewards } = me.checkin;
  const pos = doneToday ? (streak - 1) % 7 : streak % 7;

  async function claim() {
    setBusy(true);
    try {
      const r = await api<{ amount: number; me: Me }>('/rewards/checkin', { body: {} });
      setMe(r.me);
      toast(t('rewards.got', { n: r.amount }), 'success');
    } catch (e) {
      toast(errorText(e), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen scroll>
      <Header title={t('rewards.title')} />
      <Card style={{ padding: 16, gap: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={font.h3}>{t('rewards.checkin')}</Text>
          <Tag label={t('rewards.streak', { n: streak })} icon="flame" fg={colors.brandDeep} bg={colors.brandSoft} style={{ height: 26, paddingHorizontal: 9 }} />
        </View>
        <View style={styles.days} onLayout={(e) => setGridW(e.nativeEvent.layout.width)}>
          {rewards.map((r, i) => {
            const done = i < pos || (doneToday && i === pos);
            const today = i === pos;
            return (
              <Appear key={i} i={i}>
              <View style={[styles.day, { width: i === 6 ? cellW * 2 + GAP : cellW, backgroundColor: done ? colors.coin : today ? colors.brandSoft : colors.bgSunken }, today && !done && styles.today, i === 6 && styles.bigDay]}>
                {done ? <LinearGradient colors={gradients.gold} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: radius.md }]} /> : null}
                <Text style={styles.dayLabel}>{t('rewards.day', { n: i + 1 })}</Text>
                <CoinIcon size={i === 6 ? 30 : 24} />
                <Text style={styles.dayAmount}>+{r}</Text>
                {done ? <View style={styles.tick}><Icon name="checkmark" size={11} color={colors.white} /></View> : null}
              </View>
              </Appear>
            );
          })}
        </View>
        <Btn title={doneToday ? t('rewards.claimed') : t('rewards.claim')} disabled={doneToday} loading={busy} onPress={claim} />
      </Card>
      <Card style={{ padding: 16, gap: 10, marginTop: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><View style={styles.invIcon}><Icon name="userAdd" size={18} color={colors.ink} /></View><Text style={[font.h3, { flex: 1 }]}>{t('rewards.inviteTitle')}</Text></View>
        <Text style={font.small}>{t('rewards.inviteSub')}</Text>
        <View style={styles.code}><Text style={styles.codeText}>{String(me.shortId)}</Text></View>
        <Btn size="md" kind="dark" title={t('common.share')} icon="share" onPress={() => void Share.share({ message: t('rewards.inviteShare', { code: String(me.shortId), url: WEB_URL }) })} />
      </Card>
    </Screen>
  );
}

const GAP = 8;

const styles = StyleSheet.create({
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  day: { height: 84, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', gap: 4 },
  today: { borderWidth: 1.5, borderColor: colors.brand, borderStyle: 'dashed' },
  bigDay: { flexDirection: 'row', gap: 10 },
  dayLabel: { color: colors.ink, fontSize: 11, lineHeight: 14, fontFamily: fonts.bold },
  dayAmount: { color: colors.ink, fontFamily: fonts.black, fontSize: 14, lineHeight: 18 },
  tick: { position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: 9, backgroundColor: colors.online, alignItems: 'center', justifyContent: 'center' },
  invIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.onlineSoft, alignItems: 'center', justifyContent: 'center' },
  code: { alignSelf: 'flex-start', backgroundColor: colors.coinSoft, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 6, borderStyle: 'dashed' },
  codeText: { color: colors.ink, fontFamily: fonts.display, fontSize: 20, letterSpacing: 2 },
});
