import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, font, fonts, radius } from '@/theme';
import { Box, Btn, Card, Header, Input, Loader, PressBox, Screen, T, Tabs, Tag } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { Avatar } from '@/components/Avatar';
import { DiamondAmount } from '@/components/Badges';
import { api } from '@/lib/api';
import { errorText } from '@/lib/format';
import { useStore } from '@/store';
import type { PublicUser } from '@/lib/types';

interface Dash {
  agency: { id: string; name: string; code: string; status: string; commissionRate: number } | null;
  stats?: { members: number; weekDiamonds: number; monthDiamonds: number; monthCommission: number };
  members?: { user: PublicUser; weekDiamonds: number; monthDiamonds: number }[];
  requests?: { id: string; user: PublicUser }[];
}

export default function Agency() {
  const { t } = useTranslation();
  const { me, toast, refreshMe } = useStore();
  const [dash, setDash] = useState<Dash | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [form, setForm] = useState({ city: '', contactName: '', contactPhone: '', expectedHosts: '', experience: '', description: '' });
  const [mode, setMode] = useState<'join' | 'create'>('join');
  const [busy, setBusy] = useState(false);
  const [myReq, setMyReq] = useState<{ status: string; agency: { name: string } } | null>(null);

  const load = useCallback(async () => {
    try {
      setDash(await api<Dash>('/agencies/me'));
      const r = await api<{ request: typeof myReq }>('/agencies/my-request');
      setMyReq(r.request);
    } catch (e) {
      toast(errorText(e), 'error');
    }
  }, [toast]);
  useEffect(() => {
    void load();
  }, [load]);

  async function act(fn: () => Promise<unknown>, okMsg?: string) {
    setBusy(true);
    try {
      await fn();
      if (okMsg) toast(okMsg, 'success');
      await Promise.all([load(), refreshMe()]);
    } catch (e) {
      toast(errorText(e), 'error');
    } finally {
      setBusy(false);
    }
  }

  if (!dash || !me) return <Screen><Header title={t('agency.title')} /><Loader full /></Screen>;
  const a = dash.agency;

  if (a) {
    return (
      <Screen scroll>
        <Header title={a.name} />
        {a.status !== 'ACTIVE' ? <Tag label={`⏳ ${t('agency.pending')}`} bg={colors.coinSoft} style={{ alignSelf: 'center', marginBottom: 10, height: 26, paddingHorizontal: 10 }} /> : null}
        <Box r={26} sh={6} bg={colors.lilac} inner={styles.hero}>
          <T v="label">{t('agency.inviteCode', { code: a.code })}</T>
          <View style={styles.statsRow}>
            {[
              [t('agency.members'), String(dash.stats?.members ?? 0)],
              [t('agency.week'), `💎 ${dash.stats?.weekDiamonds ?? 0}`],
              [t('agency.month'), `💎 ${dash.stats?.monthDiamonds ?? 0}`],
            ].map(([k, v]) => (
              <View key={k} style={{ alignItems: 'center', flex: 1 }}>
                <T v="num">{v}</T>
                <T v="tiny" color={colors.textMuted}>{k}</T>
              </View>
            ))}
          </View>
          <T v="bodyStrong">{t('agency.commission')}: 💎 {dash.stats?.monthCommission ?? 0}</T>
          <Btn size="md" kind="dark" title={t('common.share')} icon="share" onPress={() => void Share.share({ message: `Simo ${t('agency.code')}: ${a.code}` })} />
        </Box>
        {dash.requests?.length ? (
          <>
            <Text style={[font.h3, { marginTop: 18, marginBottom: 8 }]}>{t('agency.requests')}</Text>
            <Card>
              {dash.requests.map((r) => (
                <View key={r.id} style={styles.row}>
                  <Avatar uri={r.user.avatarUrl} name={r.user.name} size={40} />
                  <Text style={[font.body, { flex: 1 }]}>{r.user.name}</Text>
                  <Pressable onPress={() => void act(() => api(`/agencies/requests/${r.id}/approve`, { body: {} }))} style={[styles.small, { backgroundColor: colors.online }]}><Text style={styles.smallText}>{t('agency.approve')}</Text></Pressable>
                  <Pressable onPress={() => void act(() => api(`/agencies/requests/${r.id}/reject`, { body: {} }))} style={[styles.small, { backgroundColor: colors.card }]}><Text style={[styles.smallText, { color: colors.ink }]}>{t('agency.reject')}</Text></Pressable>
                </View>
              ))}
            </Card>
          </>
        ) : null}
        <Text style={[font.h3, { marginTop: 18, marginBottom: 8 }]}>{t('agency.members')}</Text>
        <Card>
          {dash.members?.map((m) => (
            <Pressable key={m.user.id} onPress={() => router.push({ pathname: '/user/[id]', params: { id: m.user.id } })} style={styles.row}>
              <Avatar uri={m.user.avatarUrl} name={m.user.name} size={44} online={m.user.online} />
              <View style={{ flex: 1 }}>
                <Text style={font.body}>{m.user.name}{m.user.isHost ? ' ✨' : ''}</Text>
                <Text style={font.tiny}>{t('agency.week')}: {m.weekDiamonds} · {t('agency.month')}: {m.monthDiamonds}</Text>
              </View>
              {!m.user.isHost ? (
                <Pressable onPress={() => void act(() => api(`/agencies/members/${m.user.id}/approve-host`, { body: {} }), '✓')} style={[styles.small, { backgroundColor: colors.brand }]}><Text style={styles.smallText}>{t('agency.approveHost')}</Text></Pressable>
              ) : <DiamondAmount n={m.monthDiamonds} size={14} />}
            </Pressable>
          ))}
          {!dash.members?.length ? <Text style={[font.small, { padding: 16 }]}>{t('agency.pitch', { n: Math.round(a.commissionRate * 100) })}</Text> : null}
        </Card>
      </Screen>
    );
  }

  if (me.agency) {
    return (
      <Screen>
        <Header title={t('agency.title')} />
        <Card style={{ padding: 20, gap: 12, alignItems: 'center' }}>
          <Text style={font.h2}>{t('agency.yourAgency', { name: me.agency.name })}</Text>
          <Text style={font.small}>{t('agency.code')}: {me.agency.code}</Text>
          <Btn kind="light" title={t('agency.leave')} icon="exit" onPress={() => void act(() => api('/agencies/leave', { body: {} }))} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Header title={t('agency.title')} />
      <Box r={26} sh={6} bg={colors.lilac} inner={styles.hero}>
        <View style={styles.heroIcon}><Icon name="business" size={26} color={colors.ink} /></View>
        <T v="h2">{t('agency.hostPitch')}</T>
        <T v="body" color={colors.textMuted}>{t('agency.pitch', { n: 10 })}</T>
      </Box>
      {myReq?.status === 'PENDING' ? <Tag label={`⏳ ${myReq.agency.name} — ${t('earnings.status.PENDING')}`} bg={colors.coinSoft} style={{ marginTop: 12, height: 26, paddingHorizontal: 10 }} /> : null}
      <View style={{ marginVertical: 16 }}>
        <Tabs value={mode} onChange={setMode} options={[{ key: 'join', label: t('agency.join') }, { key: 'create', label: t('agency.create') }]} />
      </View>
      {mode === 'join' ? (
        <View style={{ gap: 12 }}>
          <Btn title={t('agency.browse')} icon="search" onPress={() => router.push('/agencies')} />
          <PressBox r={radius.lg} sh={1} onPress={() => router.push('/host-tasks')} inner={styles.taskRow}>
            <Icon name="checkmark" size={18} color={colors.online} />
            <T v="bodyStrong" style={{ flex: 1 }}>{t('hostTasks.title')}</T>
            <Icon name="chevron" size={16} color={colors.textDim} />
          </PressBox>
          <T v="label" color={colors.textMuted} style={{ marginTop: 8 }}>{t('agency.orCode')}</T>
          <Input label={t('agency.code')} value={code} onChangeText={(v) => setCode(v.toUpperCase())} autoCapitalize="characters" placeholder="ABC123" />
          <Btn kind="dark" title={t('agency.join')} loading={busy} disabled={code.length < 4} onPress={() => void act(() => api('/agencies/join', { body: { code } }), t('agency.joinSent'))} />
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          <T v="small" color={colors.textMuted}>{t('agency.createInfo')}</T>
          {me.kycStatus !== 'PENDING' && me.kycStatus !== 'APPROVED' ? (
            <PressBox r={radius.lg} sh={0} bg={colors.skySoft} onPress={() => router.push('/verify')} inner={styles.taskRow}>
              <Icon name="shield" size={18} color={colors.diamond} />
              <T v="bodyStrong" style={{ flex: 1 }}>{t('earnings.needKyc')}</T>
            </PressBox>
          ) : null}
          <Input label={t('agency.name')} value={name} onChangeText={setName} maxLength={40} />
          <Input label={t('agency.city')} value={form.city} onChangeText={(v) => setForm({ ...form, city: v })} maxLength={40} />
          <Input label={t('agency.contactName')} value={form.contactName} onChangeText={(v) => setForm({ ...form, contactName: v })} maxLength={80} />
          <Input label={t('agency.contactPhone')} value={form.contactPhone} onChangeText={(v) => setForm({ ...form, contactPhone: v })} keyboardType="phone-pad" placeholder="+994 50 000 00 00" />
          <Input label={t('agency.expectedHosts')} value={form.expectedHosts} onChangeText={(v) => setForm({ ...form, expectedHosts: v.replace(/\D/g, '') })} keyboardType="number-pad" placeholder="10" />
          <Input label={t('agency.experience')} value={form.experience} onChangeText={(v) => setForm({ ...form, experience: v })} multiline maxLength={500} />
          <Input label={t('agency.description')} value={form.description} onChangeText={(v) => setForm({ ...form, description: v })} multiline maxLength={500} />
          <Btn
            title={t('agency.submit')}
            loading={busy}
            disabled={name.trim().length < 3 || form.city.trim().length < 2 || form.contactName.trim().length < 3 || form.contactPhone.trim().length < 7 || !Number(form.expectedHosts)}
            onPress={() => void act(() => api('/agencies', { body: { name: name.trim(), city: form.city.trim(), contactName: form.contactName.trim(), contactPhone: form.contactPhone.trim(), expectedHosts: Number(form.expectedHosts), experience: form.experience, description: form.description } }), t('agency.pending'))}
          />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  hero: { padding: 20, gap: 12 },
  heroIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: radius.md, paddingVertical: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderBottomWidth: 1, borderColor: colors.hairline },
  small: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill },
  smallText: { color: colors.white, fontFamily: fonts.bold, fontSize: 12 },
});
