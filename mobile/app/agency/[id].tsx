import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, fonts, noPad, radius, tintFor } from '@/theme';
import { Btn, Card, Header, Loader, Screen, SectionTitle, T } from '@/components/ui';
import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { api, ApiError } from '@/lib/api';
import { errorText } from '@/lib/format';
import { useStore } from '@/store';
import type { PublicUser } from '@/lib/types';
import { TIER_COLORS, TierPill, type AgencyCard } from '../agencies';

const TIERS = [['Bürünc', 0.15], ['Gümüş', 0.16], ['Qızıl', 0.17], ['Platin', 0.18], ['Brilyant', 0.2]] as const;

/** Agentlik səhifəsi: şərtlər, səviyyə, top hostlar, müraciət */
export default function AgencyDetail() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { me, toast } = useStore();
  const [d, setD] = useState<{ agency: AgencyCard; owner: PublicUser | null; topHosts: PublicUser[]; requested: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => {
    void api<NonNullable<typeof d>>(`/agencies/detail/${id}`).then(setD).catch((e) => { toast(errorText(e), 'error'); router.back(); });
  }, [id, toast]);
  useEffect(load, [load]);

  async function apply() {
    setBusy(true);
    try {
      await api(`/agencies/${id}/apply`, { body: {} });
      toast(t('agency.joinSent'), 'success');
      load();
    } catch (e) {
      if (e instanceof ApiError && e.code === 'HOST_REQUIREMENTS') router.push('/host-tasks');
      else toast(errorText(e), 'error');
    } finally {
      setBusy(false);
    }
  }

  if (!d) return <Screen><Header /><Loader full /></Screen>;
  const a = d.agency;
  const inAgency = !!me?.agency;
  return (
    <Screen scroll>
      <Header title={a.name} />
      <View style={styles.hero}>
        <View style={[styles.logo, { backgroundColor: tintFor(a.name) }]}>
          {a.logoUrl ? <Image source={{ uri: a.logoUrl }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Text style={styles.logoText}>{a.name.slice(0, 1)}</Text>}
        </View>
        <Text style={styles.name}>{a.name}</Text>
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          <TierPill tier={a.tier} name={a.tierName} />
          <T v="small" color={colors.nightMuted}>{t('agency.hostsCount', { n: a.members })}{a.city ? ` · ${a.city}` : ''}</T>
        </View>
        {a.description ? <T v="small" color={colors.nightMuted} center style={{ marginTop: 6 }}>{a.description}</T> : null}
      </View>

      <View style={styles.terms}>
        {[
          [t('agency.hostShareShort'), `${Math.round(a.hostShare * 100)}%`],
          [t('agency.msgPrice'), `${a.defaultMsgPrice} ${t('common.coins')}`],
          [t('agency.code'), a.code],
        ].map(([k, v]) => (
          <View key={k} style={styles.term}><Text style={styles.termNum} numberOfLines={1}>{v}</Text><T v="tiny" color={colors.textMuted}>{k}</T></View>
        ))}
      </View>

      <SectionTitle title={t('agency.howItWorks')} />
      <Card style={{ padding: 16, gap: 10 }}>
        <T v="small" color={colors.textMuted}>{t('agency.splitInfo')}</T>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {TIERS.map(([n, sh], i) => (
            <View key={n} style={[styles.tierCol, { backgroundColor: TIER_COLORS[i], opacity: a.tier === i + 1 ? 1 : 0.45 }]}>
              <Text style={styles.tierColName} numberOfLines={1}>{n}</Text>
              <Text style={styles.tierColPct}>{Math.round(sh * 100)}%</Text>
            </View>
          ))}
        </View>
        <T v="tiny" color={colors.textDim}>{t('agency.tierNote')}</T>
      </Card>

      {d.topHosts.length ? (
        <>
          <SectionTitle title={t('agency.topHosts')} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {d.topHosts.map((h) => (
              <Pressable key={h.id} onPress={() => router.push({ pathname: '/user/[id]', params: { id: h.id } })} style={{ alignItems: 'center', width: 64, gap: 6 }}>
                <Avatar uri={h.avatarUrl} name={h.name} size={60} online={h.online} vipTier={h.vipTier} />
                <T v="tiny" numberOfLines={1}>{h.name}</T>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      <View style={{ height: 20 }} />
      {inAgency ? <T v="small" color={colors.textMuted} center>{t('agency.alreadyMember')}</T> : d.requested ? (
        <View style={styles.pending}><Icon name="time" size={18} color={colors.ink} /><T v="bodyStrong">{t('agency.requestPending')}</T></View>
      ) : (
        <Btn title={t('agency.apply')} icon="business" loading={busy} onPress={apply} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.night, borderRadius: radius.xl, padding: 20, alignItems: 'center', gap: 8 },
  logo: { width: 76, height: 76, borderRadius: 24, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  logoText: { ...noPad, fontFamily: fonts.displayBlack, fontSize: 32, lineHeight: 38, color: colors.ink },
  name: { ...noPad, fontFamily: fonts.display, fontSize: 24, lineHeight: 30, color: colors.white, textAlign: 'center' },
  terms: { flexDirection: 'row', gap: 10, marginTop: 12 },
  term: { flex: 1, backgroundColor: colors.card, borderRadius: radius.md, padding: 12, alignItems: 'center', gap: 2 },
  termNum: { ...noPad, fontFamily: fonts.display, fontSize: 17, lineHeight: 22, color: colors.ink },
  tierCol: { flex: 1, borderRadius: 12, paddingVertical: 8, alignItems: 'center' },
  tierColName: { ...noPad, fontFamily: fonts.bold, fontSize: 10, lineHeight: 13, color: colors.ink },
  tierColPct: { ...noPad, fontFamily: fonts.black, fontSize: 14, lineHeight: 18, color: colors.ink },
  pending: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 56, borderRadius: 28, backgroundColor: colors.coinSoft },
});
