import React, { useState } from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { colors, font, gradients, radius } from '@/theme';
import { Card, GradientButton, Header, OutlineButton, Screen } from '@/components/ui';
import { CoinIcon } from '@/components/GiftIcon';
import { api } from '@/lib/api';
import { errorText } from '@/lib/format';
import { useStore } from '@/store';
import { WEB_URL } from '@/config';
import type { Me } from '@/lib/types';

export default function Rewards() {
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
          <Text style={{ color: colors.peach, fontWeight: '800' }}>🔥 {t('rewards.streak', { n: streak })}</Text>
        </View>
        <View style={styles.days}>
          {rewards.map((r, i) => {
            const done = i < pos || (doneToday && i === pos);
            const today = i === pos;
            return (
              <LinearGradient key={i} colors={done ? gradients.gold : today ? gradients.primary : [colors.surface2, colors.surface2]} style={[styles.day, i === 6 && { width: '100%' }]}>
                <Text style={[styles.dayLabel, done && { color: '#3A1F00' }]}>{t('rewards.day', { n: i + 1 })}</Text>
                <CoinIcon size={i === 6 ? 34 : 24} />
                <Text style={[styles.dayAmount, done && { color: '#3A1F00' }]}>+{r}</Text>
              </LinearGradient>
            );
          })}
        </View>
        <GradientButton title={doneToday ? t('rewards.claimed') : t('rewards.claim')} disabled={doneToday} loading={busy} onPress={claim} />
      </Card>
      <Card style={{ padding: 16, gap: 10, marginTop: 14 }}>
        <Text style={font.h3}>🤝 {t('rewards.inviteTitle')}</Text>
        <Text style={font.small}>{t('rewards.inviteSub')}</Text>
        <Text style={{ color: colors.gold, fontWeight: '900', fontSize: 16 }}>{String(me.shortId)}</Text>
        <OutlineButton small title={t('common.share')} icon="share" onPress={() => void Share.share({ message: t('rewards.inviteShare', { code: String(me.shortId), url: WEB_URL }) })} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  day: { width: '22.8%', borderRadius: radius.md, alignItems: 'center', paddingVertical: 10, gap: 4 },
  dayLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  dayAmount: { color: '#fff', fontWeight: '900' },
});
