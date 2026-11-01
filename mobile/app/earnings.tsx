import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { colors, font, radius } from '@/theme';
import { Card, Chip, GradientButton, Header, Input, OutlineButton, Screen } from '@/components/ui';
import { DiamondIcon } from '@/components/GiftIcon';
import { api } from '@/lib/api';
import { errorText, timeAgo } from '@/lib/format';
import { useStore } from '@/store';
import type { Me } from '@/lib/types';

const METHODS = ['CARD', 'M10', 'EMANAT', 'AGENCY'] as const;
interface W { id: string; diamonds: number; amountQepik: number; method: string; status: string; createdAt: string }

export default function Earnings() {
  const { t } = useTranslation();
  const { me, setMe, toast } = useStore();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<(typeof METHODS)[number]>('CARD');
  const [account, setAccount] = useState('');
  const [exchange, setExchange] = useState('');
  const [list, setList] = useState<W[]>([]);
  const [busy, setBusy] = useState(false);
  const [video, setVideo] = useState(String(me?.videoCallPrice ?? 60));
  const [voice, setVoice] = useState(String(me?.voiceCallPrice ?? 30));

  const load = useCallback(() => {
    void api<{ items: W[] }>('/wallet/withdrawals').then((r) => setList(r.items)).catch(() => {});
  }, []);
  useEffect(load, [load]);
  if (!me) return null;
  const isHost = me.hostStatus === 'APPROVED';

  async function withdraw() {
    setBusy(true);
    try {
      await api('/wallet/withdraw', { body: { diamonds: Number(amount), method, account } });
      toast(t('earnings.sent'), 'success');
      setAmount('');
      setMe(await api<Me>('/me'));
      load();
    } catch (e) {
      toast(errorText(e), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function doExchange() {
    try {
      setMe(await api<Me>('/wallet/exchange', { body: { diamonds: Number(exchange) } }));
      setExchange('');
      toast('✓', 'success');
    } catch (e) {
      toast(errorText(e), 'error');
    }
  }

  async function savePrices() {
    try {
      setMe(await api<Me>('/me/call-prices', { method: 'PATCH', body: { videoCallPrice: Number(video), voiceCallPrice: Number(voice) } }));
      toast('✓', 'success');
    } catch (e) {
      toast(errorText(e), 'error');
    }
  }

  return (
    <Screen scroll>
      <Header title={t('earnings.title')} />
      <LinearGradient colors={['#6FE3FF', '#7B5CFF', '#C850C0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <Text style={{ color: 'rgba(255,255,255,0.85)', fontWeight: '700' }}>{t('earnings.diamonds')}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <DiamondIcon size={40} />
          <Text style={{ color: '#fff', fontSize: 42, fontWeight: '900' }}>{me.diamonds}</Text>
        </View>
        <Text style={{ color: '#fff', fontWeight: '700' }}>{t('earnings.cashValue', { azn: (me.diamonds / 100).toFixed(2) })}</Text>
        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>{t('earnings.howTo')}</Text>
      </LinearGradient>

      {isHost ? (
        <Card style={styles.block}>
          <Text style={font.h3}>{t('earnings.callPrices')}</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}><Input label={t('earnings.videoPrice')} value={video} onChangeText={setVideo} keyboardType="number-pad" /></View>
            <View style={{ flex: 1 }}><Input label={t('earnings.voicePrice')} value={voice} onChangeText={setVoice} keyboardType="number-pad" /></View>
          </View>
          <OutlineButton small title={t('common.save')} onPress={savePrices} />
        </Card>
      ) : null}

      <Card style={styles.block}>
        <Text style={font.h3}>{t('earnings.exchange')}</Text>
        <Text style={font.small}>{t('earnings.exchangeSub', { rate: 2 })}</Text>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}><Input value={exchange} onChangeText={(v) => setExchange(v.replace(/\D/g, ''))} keyboardType="number-pad" placeholder="100" /></View>
          <OutlineButton small title={`→ 🪙 ${Math.floor(Number(exchange || 0) / 2)}`} onPress={doExchange} />
        </View>
      </Card>

      <Card style={styles.block}>
        <Text style={font.h3}>{t('earnings.withdraw')}</Text>
        <Text style={font.small}>{t('earnings.min', { n: 5000 })} · 100 💎 = 1 ₼</Text>
        <Input label={t('earnings.amount')} value={amount} onChangeText={(v) => setAmount(v.replace(/\D/g, ''))} keyboardType="number-pad" placeholder="5000" />
        <Text style={font.small}>{t('earnings.method')}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {METHODS.filter((m) => m !== 'AGENCY' || me.agency).map((m) => <Chip key={m} label={t(`earnings.methods.${m}`)} active={method === m} onPress={() => setMethod(m)} />)}
        </View>
        <Input label={t('earnings.account')} value={account} onChangeText={setAccount} placeholder="4169 •••• •••• ••••" />
        <GradientButton title={`${t('earnings.withdraw')}${amount ? ` · ${(Number(amount) / 100).toFixed(2)} ₼` : ''}`} loading={busy} disabled={Number(amount) < 5000 || account.length < 4 || Number(amount) > me.diamonds} onPress={withdraw} />
      </Card>

      {list.length ? (
        <>
          <Text style={[font.h3, { marginTop: 16, marginBottom: 8 }]}>{t('earnings.requests')}</Text>
          <Card>
            {list.map((w) => (
              <View key={w.id} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={font.body}>{(w.amountQepik / 100).toFixed(2)} ₼ · {t(`earnings.methods.${w.method}`)}</Text>
                  <Text style={font.tiny}>{timeAgo(w.createdAt)} · 💎 {w.diamonds}</Text>
                </View>
                <Text style={{ color: w.status === 'PAID' ? colors.online : w.status === 'REJECTED' ? colors.danger : colors.gold, fontWeight: '700' }}>{t(`earnings.status.${w.status}`)}</Text>
              </View>
            ))}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: radius.xl, padding: 22, gap: 6 },
  block: { padding: 16, gap: 10, marginTop: 14 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderColor: colors.border },
});
