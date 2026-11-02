import { ECON, diamondsToAzn } from '@/lib/economy';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, font, fonts } from '@/theme';
import { Box, Btn, Card, Chip, Header, Input, Screen, T, Tag } from '@/components/ui';
import { Burst } from '@/components/Burst';
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
      <Box r={26} sh={6} bg={colors.diamond} inner={styles.hero}>
        <View style={{ position: 'absolute', right: -40, top: -40 }}><Burst size={130} color={colors.diamondSoft} points={16} /></View>
        <T v="label" color={colors.white}>{t('earnings.diamonds')}</T>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <DiamondIcon size={42} />
          <Text style={styles.heroNum}>{me.diamonds.toLocaleString('en-US')}</Text>
        </View>
        <Tag label={t('earnings.cashValue', { azn: diamondsToAzn(me.diamonds, false).toFixed(2) })} bg={colors.highlight} style={{ height: 26, paddingHorizontal: 10 }} />
        <T v="small" color="rgba(255,255,255,0.9)">{t('earnings.howTo')}</T>
      </Box>

      {isHost ? (
        <Card style={styles.block}>
          <Text style={font.h3}>{t('earnings.callPrices')}</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}><Input label={t('earnings.videoPrice')} value={video} onChangeText={setVideo} keyboardType="number-pad" /></View>
            <View style={{ flex: 1 }}><Input label={t('earnings.voicePrice')} value={voice} onChangeText={setVoice} keyboardType="number-pad" /></View>
          </View>
          <Btn size="md" kind="dark" title={t('common.save')} onPress={savePrices} />
        </Card>
      ) : null}

      <Card style={styles.block}>
        <Text style={font.h3}>{t('earnings.exchange')}</Text>
        <Text style={font.small}>{t('earnings.exchangeSub', { rate: ECON.diamondsPerCoin })}</Text>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}><Input value={exchange} onChangeText={(v) => setExchange(v.replace(/\D/g, ''))} keyboardType="number-pad" placeholder="100" /></View>
          <Btn full={false} size="lg" kind="coin" title={`→ 🪙 ${Math.floor(Number(exchange || 0) / ECON.diamondsPerCoin)}`} onPress={doExchange} />
        </View>
      </Card>

      <Card style={styles.block}>
        <Text style={font.h3}>{t('earnings.withdraw')}</Text>
        <Text style={font.small}>{t('earnings.min', { n: ECON.minWithdrawDiamonds })} · {ECON.diamondsPerAzn} 💎 = 1 ₼ · {t('earnings.fee', { n: ECON.withdrawFeeRate * 100 })}</Text>
        <Input label={t('earnings.amount')} value={amount} onChangeText={(v) => setAmount(v.replace(/\D/g, ''))} keyboardType="number-pad" placeholder={String(ECON.minWithdrawDiamonds)} />
        <Text style={font.small}>{t('earnings.method')}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {METHODS.filter((m) => m !== 'AGENCY' || me.agency).map((m) => <Chip key={m} label={t(`earnings.methods.${m}`)} active={method === m} onPress={() => setMethod(m)} />)}
        </View>
        <Input label={t('earnings.account')} value={account} onChangeText={setAccount} placeholder="4169 •••• •••• ••••" />
        <Btn title={`${t('earnings.withdraw')}${amount ? ` · ${diamondsToAzn(Number(amount)).toFixed(2)} ₼` : ''}`} loading={busy} disabled={Number(amount) < ECON.minWithdrawDiamonds || account.length < 4 || Number(amount) > me.diamonds} onPress={withdraw} />
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
                <Tag label={t(`earnings.status.${w.status}`)} bg={w.status === 'PAID' ? colors.onlineSoft : w.status === 'REJECTED' ? colors.brandSoft : colors.coinSoft} />
              </View>
            ))}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { padding: 20, gap: 8 },
  heroNum: { color: colors.white, fontSize: 42, fontFamily: fonts.display, letterSpacing: -1.5, textShadowColor: 'rgba(0,0,0,0.18)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 },
  block: { padding: 16, gap: 10, marginTop: 14 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderColor: colors.hairline },
});
