import React, { useState } from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, font, fonts, radius } from '@/theme';
import { Btn, Card, Header, Screen, Tag } from '@/components/ui';
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
          <Tag label={`🔥 ${t('rewards.streak', { n: streak })}`} bg={colors.brandSoft} style={{ height: 26, paddingHorizontal: 9 }} />
        </View>
        <View style={styles.days}>
          {rewards.map((r, i) => {
            const done = i < pos || (doneToday && i === pos);
            const today = i === pos;
            return (
              <View key={i} style={[styles.day, { backgroundColor: done ? colors.coin : today ? colors.brandSoft : colors.card }, today && !done && { borderStyle: 'dashed' }, i === 6 && { width: '100%', flexDirection: 'row', justifyContent: 'center', gap: 10 }]}>
                <Text style={styles.dayLabel}>{t('rewards.day', { n: i + 1 })}</Text>
                <CoinIcon size={i === 6 ? 34 : 24} />
                <Text style={styles.dayAmount}>+{r}</Text>
                {done ? <View style={styles.tick}><Text style={{ color: colors.white, fontSize: 10, fontFamily: fonts.black }}>✓</Text></View> : null}
              </View>
            );
          })}
        </View>
        <Btn title={doneToday ? t('rewards.claimed') : t('rewards.claim')} disabled={doneToday} loading={busy} onPress={claim} />
      </Card>
      <Card style={{ padding: 16, gap: 10, marginTop: 14 }}>
        <Text style={font.h3}>🤝 {t('rewards.inviteTitle')}</Text>
        <Text style={font.small}>{t('rewards.inviteSub')}</Text>
        <View style={styles.code}><Text style={styles.codeText}>{String(me.shortId)}</Text></View>
        <Btn size="md" kind="dark" title={t('common.share')} icon="share" onPress={() => void Share.share({ message: t('rewards.inviteShare', { code: String(me.shortId), url: WEB_URL }) })} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  day: { width: '22.8%', borderRadius: radius.md, alignItems: 'center', paddingVertical: 10, gap: 4 },
  dayLabel: { color: colors.ink, fontSize: 11, fontFamily: fonts.bold },
  dayAmount: { color: colors.ink, fontFamily: fonts.black },
  tick: { position: 'absolute', top: -7, right: -7, width: 18, height: 18, borderRadius: 9, backgroundColor: colors.online, alignItems: 'center', justifyContent: 'center' },
  code: { alignSelf: 'flex-start', backgroundColor: colors.coinSoft, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 6, borderStyle: 'dashed' },
  codeText: { color: colors.ink, fontFamily: fonts.display, fontSize: 20, letterSpacing: 2 },
});
