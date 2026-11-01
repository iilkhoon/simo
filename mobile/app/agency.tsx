import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, font, gradients, radius } from '@/theme';
import { Card, GradientButton, Header, Input, Loader, OutlineButton, Screen } from '@/components/ui';
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
        {a.status !== 'ACTIVE' ? <Text style={[font.small, { color: colors.gold, textAlign: 'center', marginBottom: 10 }]}>⏳ {t('agency.pending')}</Text> : null}
        <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>{t('agency.inviteCode', { code: a.code })}</Text>
          <View style={styles.statsRow}>
            {[
              [t('agency.members'), String(dash.stats?.members ?? 0)],
              [t('agency.week'), `💎 ${dash.stats?.weekDiamonds ?? 0}`],
              [t('agency.month'), `💎 ${dash.stats?.monthDiamonds ?? 0}`],
            ].map(([k, v]) => (
              <View key={k} style={{ alignItems: 'center', flex: 1 }}>
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900' }}>{v}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>{k}</Text>
              </View>
            ))}
          </View>
          <Text style={{ color: '#fff', fontWeight: '800' }}>{t('agency.commission')}: 💎 {dash.stats?.monthCommission ?? 0}</Text>
          <OutlineButton small title={t('common.share')} icon="share" onPress={() => void Share.share({ message: `Simo ${t('agency.code')}: ${a.code}` })} />
        </LinearGradient>
        {dash.requests?.length ? (
          <>
            <Text style={[font.h3, { marginTop: 18, marginBottom: 8 }]}>{t('agency.requests')}</Text>
            <Card>
              {dash.requests.map((r) => (
                <View key={r.id} style={styles.row}>
                  <Avatar uri={r.user.avatarUrl} name={r.user.name} size={40} />
                  <Text style={[font.body, { flex: 1 }]}>{r.user.name}</Text>
                  <Pressable onPress={() => void act(() => api(`/agencies/requests/${r.id}/approve`, { body: {} }))} style={[styles.small, { backgroundColor: colors.online }]}><Text style={styles.smallText}>{t('agency.approve')}</Text></Pressable>
                  <Pressable onPress={() => void act(() => api(`/agencies/requests/${r.id}/reject`, { body: {} }))} style={[styles.small, { backgroundColor: colors.surface2 }]}><Text style={styles.smallText}>{t('agency.reject')}</Text></Pressable>
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
                <Pressable onPress={() => void act(() => api(`/agencies/members/${m.user.id}/approve-host`, { body: {} }), '✓')} style={[styles.small, { backgroundColor: colors.rose }]}><Text style={styles.smallText}>{t('agency.approveHost')}</Text></Pressable>
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
          <OutlineButton danger title={t('agency.leave')} onPress={() => void act(() => api('/agencies/leave', { body: {} }))} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Header title={t('agency.title')} />
      <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <Text style={{ fontSize: 34 }}>🏢</Text>
        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900' }}>{t('agency.hostPitch')}</Text>
        <Text style={{ color: 'rgba(255,255,255,0.9)' }}>{t('agency.pitch', { n: 10 })}</Text>
      </LinearGradient>
      {myReq?.status === 'PENDING' ? <Text style={[font.small, { color: colors.gold, marginTop: 12 }]}>⏳ {myReq.agency.name} — {t('earnings.status.PENDING')}</Text> : null}
      <View style={{ flexDirection: 'row', gap: 10, marginVertical: 16 }}>
        <OutlineButton small title={t('agency.join')} style={[{ flex: 1 }, mode === 'join' && { borderColor: colors.rose }]} onPress={() => setMode('join')} />
        <OutlineButton small title={t('agency.create')} style={[{ flex: 1 }, mode === 'create' && { borderColor: colors.rose }]} onPress={() => setMode('create')} />
      </View>
      {mode === 'join' ? (
        <View style={{ gap: 12 }}>
          <Input label={t('agency.code')} value={code} onChangeText={(v) => setCode(v.toUpperCase())} autoCapitalize="characters" placeholder="ABC123" />
          <GradientButton title={t('agency.join')} loading={busy} disabled={code.length < 4} onPress={() => void act(() => api('/agencies/join', { body: { code } }), t('agency.joinSent'))} />
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          <Input label={t('agency.name')} value={name} onChangeText={setName} maxLength={40} />
          <GradientButton title={t('agency.create')} loading={busy} disabled={name.trim().length < 3} onPress={() => void act(() => api('/agencies', { body: { name: name.trim() } }), t('agency.pending'))} />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: radius.xl, padding: 20, gap: 12 },
  statsRow: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: radius.md, paddingVertical: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderBottomWidth: 1, borderColor: colors.border },
  small: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill },
  smallText: { color: '#fff', fontWeight: '700', fontSize: 12 },
});
