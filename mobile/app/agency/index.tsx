import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, fonts, noPad, radius, tintFor } from '@/theme';
import { Btn, Card, Header, Input, Loader, PressBox, Screen, SectionTitle, T, Tabs, Tag } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { Avatar } from '@/components/Avatar';
import { ActionSheet } from '@/components/ActionSheet';
import { Almaz, ConfirmSheet, MiniBars, PeriodTabs, Progress, SourceBreakdown, StatTile, TileGrid, minutesLabel, unitsToAzn, type Period } from '@/components/AgencyKit';
import { TIER_COLORS } from '../agencies';
import { api } from '@/lib/api';
import { dateOnly, errorText, timeAgo } from '@/lib/format';
import { fmtAlmaz } from '@/lib/economy';
import { useStore } from '@/store';
import type { PublicUser } from '@/lib/types';

interface MemberRow {
  user: PublicUser; joinedAt: string | null; isOwner: boolean; lastSeenAt: string;
  earnings: number; commission: number; paidCoins: number; onlineMin: number; callMin: number; calls: number; gifts: number;
}
interface OwnerDash {
  agency: { id: string; name: string; code: string; status: 'PENDING' | 'ACTIVE' | 'SUSPENDED'; rejectReason: string; inviteLink: string; logoUrl: string | null } | null;
  tier?: { tier: number; name: string; share: number; tierShare: number; custom: boolean; hostShare: number; monthly: number; next: { tier: number; name: string; minMonthly: number; share: number } | null };
  stats?: { members: number; onlineNow: number; hostEarnings: number; commission: number; paidCoins: number; onlineMin: number; callMin: number; calls: number; gifts: number; bySource: Record<string, number> };
  series?: { day: string; host: number; agency: number }[];
  members?: MemberRow[];
  requests?: { id: string; createdAt: string; source: string; message: string; user: PublicUser }[];
}
interface MyAgency {
  agency: { id: string; name: string; code: string; logoUrl: string | null; city: string; status: string; members: number; tier: number; tierName: string; hostShare: number; isOwner: boolean; owner: PublicUser | null } | null;
  joinedAt: string | null; cooldownUntil: string | null; cooldownDays: number;
  request: { id: string; status: string; rejectReason: string; agency: { name: string; code: string } } | null;
}

/** Agentlik: sahib paneli / host görünüşü / qoşulma və yaratma */
export default function AgencyScreen() {
  const { t } = useTranslation();
  const { me, toast, refreshMe } = useStore();
  const params = useLocalSearchParams<{ code?: string }>();
  const [period, setPeriod] = useState<Period>('week');
  const [owner, setOwner] = useState<OwnerDash | null>(null);
  const [mine, setMine] = useState<MyAgency | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [o, m] = await Promise.all([api<OwnerDash>(`/agencies/me?period=${period}`), api<MyAgency>('/agencies/my')]);
      setOwner(o);
      setMine(m);
    } catch (e) {
      toast(errorText(e), 'error');
    }
  }, [period, toast]);
  useEffect(() => { void load(); }, [load]);

  const reload = useCallback(async () => {
    await Promise.all([load(), refreshMe()]);
  }, [load, refreshMe]);

  if (!owner || !mine || !me) return <Screen><Header title={t('agency.title')} /><Loader full /></Screen>;
  if (owner.agency) return <OwnerView d={owner} period={period} setPeriod={setPeriod} reload={reload} refreshing={refreshing} setRefreshing={setRefreshing} />;
  if (mine.agency) return <MemberView d={mine} reload={reload} />;
  return <JoinView d={mine} initialCode={typeof params.code === 'string' ? params.code : ''} reload={reload} />;
}

/* ───────────────────────── Sahib paneli ───────────────────────── */
function OwnerView({ d, period, setPeriod, reload, refreshing, setRefreshing }: {
  d: OwnerDash; period: Period; setPeriod: (p: Period) => void; reload: () => Promise<void>; refreshing: boolean; setRefreshing: (v: boolean) => void;
}) {
  const { t } = useTranslation();
  const { toast, me } = useStore();
  const a = d.agency!;
  const s = d.stats!;
  const tier = d.tier!;
  const [sheet, setSheet] = useState<MemberRow | null>(null);
  const [confirm, setConfirm] = useState<null | { title: string; body?: string; label: string; danger?: boolean; run: () => Promise<void> }>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function act(key: string, fn: () => Promise<unknown>, ok?: string) {
    setBusy(key);
    try {
      await fn();
      if (ok) toast(ok, 'success');
      await reload();
    } catch (e) {
      toast(errorText(e), 'error');
    } finally {
      setBusy(null);
    }
  }

  const series = useMemo(() => {
    const map = new Map((d.series ?? []).map((r) => [r.day, r.agency]));
    const out: { label: string; value: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const day = new Date(Date.now() + 4 * 3600_000 - i * 86400_000).toISOString().slice(0, 10);
      out.push({ label: day.slice(5).replace('-', '.'), value: map.get(day) ?? 0 });
    }
    return out;
  }, [d.series]);

  const share = () => void Share.share({ message: t('ag.inviteMsg', { name: a.name, code: a.code, link: a.inviteLink }) });
  const next = tier.next;
  const tierColor = TIER_COLORS[tier.tier - 1] ?? TIER_COLORS[0];

  return (
    <Screen>
      <Header title={a.name} sub={t('ag.owner')} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 48 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await reload(); setRefreshing(false); }} />}
        showsVerticalScrollIndicator={false}
      >
        {a.status !== 'ACTIVE' ? (
          <View style={[styles.banner, { backgroundColor: a.status === 'PENDING' ? colors.coinSoft : colors.brandSoft }]}>
            <Icon name={a.status === 'PENDING' ? 'time' : 'ban'} size={18} color={colors.ink} />
            <View style={{ flex: 1 }}>
              <T v="bodyStrong">{a.status === 'PENDING' ? t('ag.statusPending') : t('ag.statusSuspended')}</T>
              {a.rejectReason ? <T v="tiny" color={colors.textMuted}>{t('ag.reason', { r: a.rejectReason })}</T> : null}
            </View>
          </View>
        ) : null}

        <PeriodTabs value={period} onChange={setPeriod} />

        {/* Əsas kart: komissiya + host qazancı */}
        <View style={styles.hero}>
          <View style={styles.heroGlow} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <T v="label" color={colors.nightMuted}>{t('ag.commission')} · {t(`ag.period.${period}`)}</T>
            <View style={[styles.tierPill, { backgroundColor: tierColor }]}>
              <Icon name="trophy" size={11} color={colors.ink} />
              <Text style={styles.tierPillText}>{t(`ag.tiers.${tier.tier}`)} · {Math.round(tier.share * 100)}%</Text>
            </View>
          </View>
          <Text style={styles.heroNum} numberOfLines={1} adjustsFontSizeToFit>{fmtAlmaz(s.commission)}</Text>
          <T v="small" color={colors.nightMuted}>≈ {unitsToAzn(s.commission)} ₼</T>
          <View style={styles.heroSplit}>
            <View style={{ flex: 1, gap: 2 }}>
              <T v="tiny" color={colors.nightMuted}>{t('ag.hostEarnings')}</T>
              <Text style={styles.heroSmall}>{fmtAlmaz(s.hostEarnings)}</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={{ flex: 1, gap: 2 }}>
              <T v="tiny" color={colors.nightMuted}>{t('ag.paidNar')}</T>
              <Text style={styles.heroSmall}>{s.paidCoins.toLocaleString('en-US')}</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 12 }} />
        <TileGrid>
          <StatTile icon="people" label={t('ag.hosts')} value={String(s.members)} sub={s.onlineNow ? t('ag.onlineNow', { n: s.onlineNow }) : undefined} tint={colors.lilac} />
          <StatTile icon="time" label={t('ag.onlineHours')} value={minutesLabel(s.onlineMin, t)} tint={colors.onlineSoft} iconColor={colors.online} />
          <StatTile icon="videocam" label={t('ag.callMinutes')} value={minutesLabel(s.callMin, t)} tint={colors.diamondSoft} iconColor={colors.diamond} />
          <StatTile icon="call" label={t('ag.calls')} value={String(s.calls)} tint={colors.skySoft} />
          <StatTile icon="gift" label={t('ag.gifts')} value={String(s.gifts)} tint={colors.brandSoft} iconColor={colors.brand} />
          <StatTile icon="diamond" label={t('ag.hostShareIs', { n: Math.round(tier.hostShare * 100) })} value={`${Math.round(tier.share * 100)}%`} tint={colors.coinSoft} />
        </TileGrid>

        {/* Səviyyə irəliləyişi */}
        <Card style={styles.block}>
          <View style={styles.rowBetween}>
            <T v="h3">{next ? t('ag.tierProgress', { name: t(`ag.tiers.${next.tier}`) }) : t('ag.tierMax')}</T>
            {tier.custom ? <Tag label={t('ag.customShare')} bg={colors.skySoft} /> : null}
          </View>
          <Progress value={tier.monthly} max={next?.minMonthly ?? tier.monthly} color={tierColor} />
          <View style={styles.rowBetween}>
            <T v="tiny" color={colors.textMuted}>{t('ag.tierMonthly', { n: fmtAlmaz(tier.monthly) })}</T>
            {next ? <T v="tiny" color={colors.textMuted}>{t('ag.tierLeft', { n: fmtAlmaz(next.minMonthly - tier.monthly) })} · {Math.round(next.share * 100)}%</T> : null}
          </View>
        </Card>

        {/* Dəvət */}
        <Card style={styles.block}>
          <View style={styles.rowBetween}>
            <T v="h3">{t('ag.invite')}</T>
            <Pressable hitSlop={8} onPress={() => setConfirm({ title: t('ag.rotate'), body: t('ag.rotateConfirm'), label: t('ag.rotate'), run: async () => { await act('rotate', () => api('/agencies/me/rotate-code', { body: {} })); } })}>
              <View style={styles.linkBtn}><Icon name="refresh" size={14} color={colors.textMuted} /><T v="tiny" color={colors.textMuted}>{t('ag.rotate')}</T></View>
            </Pressable>
          </View>
          <T v="small" color={colors.textMuted}>{t('ag.inviteSub')}</T>
          <View style={styles.codeBox}>
            <Text style={styles.code} selectable>{a.code}</Text>
            <T v="tiny" color={colors.textMuted} numberOfLines={1} style={{ flexShrink: 1 }}>{a.inviteLink.replace(/^https?:\/\//, '')}</T>
          </View>
          <Btn size="md" kind="dark" icon="share" title={t('ag.shareInvite')} onPress={share} />
        </Card>

        {/* Qrafik + mənbə bölgüsü */}
        <Card style={styles.block}>
          <T v="h3">{t('ag.last14')}</T>
          <MiniBars data={series} />
        </Card>
        <Card style={styles.block}>
          <T v="h3">{t('earn.breakdown')}</T>
          <SourceBreakdown bySource={s.bySource} total={s.hostEarnings} />
        </Card>

        {/* Müraciətlər */}
        <SectionTitle title={`${t('ag.requests')}${d.requests?.length ? ` · ${d.requests.length}` : ''}`} />
        <Card>
          {d.requests?.length ? d.requests.map((r, i) => (
            <View key={r.id} style={[styles.reqRow, i === d.requests!.length - 1 && { borderBottomWidth: 0 }]}>
              <Pressable onPress={() => router.push({ pathname: '/user/[id]', params: { id: r.user.id } })}>
                <Avatar uri={r.user.avatarUrl} name={r.user.name} size={44} online={r.user.online} />
              </Pressable>
              <View style={{ flex: 1, gap: 2 }}>
                <T v="bodyStrong" numberOfLines={1}>{r.user.name}</T>
                <T v="tiny" color={colors.textMuted}>{r.source === 'CODE' ? t('ag.viaCode') : t('ag.viaApply')} · {timeAgo(r.createdAt)}</T>
                {r.message ? <T v="tiny" numberOfLines={2}>“{r.message}”</T> : null}
              </View>
              <View style={{ gap: 6 }}>
                <Pressable disabled={!!busy} onPress={() => void act(r.id, () => api(`/agencies/requests/${r.id}/approve`, { body: {} }), t('ag.approved'))} style={[styles.pill, { backgroundColor: colors.online }]}>
                  <Text style={styles.pillText}>{t('ag.approve')}</Text>
                </Pressable>
                <Pressable disabled={!!busy} onPress={() => void act(r.id, () => api(`/agencies/requests/${r.id}/reject`, { body: {} }), t('ag.rejected'))} style={[styles.pill, { backgroundColor: colors.bgSunken }]}>
                  <Text style={[styles.pillText, { color: colors.ink }]}>{t('ag.reject')}</Text>
                </Pressable>
              </View>
            </View>
          )) : <T v="small" color={colors.textMuted} style={{ padding: 16 }}>{t('ag.noRequests')}</T>}
        </Card>

        {/* Hostlar */}
        <SectionTitle title={t('ag.hostsList')} />
        <Card>
          {d.members?.length ? d.members.map((m, i) => (
            <Pressable key={m.user.id} onPress={() => setSheet(m)} style={({ pressed }) => [styles.hostRow, i === d.members!.length - 1 && { borderBottomWidth: 0 }, pressed && { backgroundColor: colors.bgSunken }]}>
              <Text style={[styles.rank, i < 3 && { color: colors.brand }]}>{i + 1}</Text>
              <Avatar uri={m.user.avatarUrl} name={m.user.name} size={44} online={m.user.online} />
              <View style={{ flex: 1, gap: 3 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <T v="bodyStrong" numberOfLines={1} style={{ flexShrink: 1 }}>{m.user.name}</T>
                  {m.isOwner ? <Tag label={t('ag.you')} bg={colors.lilac} /> : null}
                </View>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={styles.metric}><Icon name="time" size={11} color={colors.textDim} /><T v="tiny" color={colors.textMuted}>{minutesLabel(m.onlineMin, t)}</T></View>
                  <View style={styles.metric}><Icon name="videocam" size={11} color={colors.textDim} /><T v="tiny" color={colors.textMuted}>{minutesLabel(m.callMin, t)}</T></View>
                  <View style={styles.metric}><Icon name="gift" size={11} color={colors.textDim} /><T v="tiny" color={colors.textMuted}>{m.gifts}</T></View>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 2 }}>
                <Almaz units={m.earnings} size={14} />
                {m.commission > 0 ? <T v="tiny" color={colors.online}>+{fmtAlmaz(m.commission)}</T> : null}
              </View>
            </Pressable>
          )) : <T v="small" color={colors.textMuted} style={{ padding: 16 }}>{t('ag.noHosts')}</T>}
        </Card>
      </ScrollView>

      <ActionSheet
        visible={!!sheet}
        title={sheet ? `${sheet.user.name}${sheet.joinedAt ? ` · ${t('ag.joined', { d: dateOnly(sheet.joinedAt) })}` : ''}` : undefined}
        onClose={() => setSheet(null)}
        options={sheet ? [
          { label: t('ag.viewProfile'), onPress: () => router.push({ pathname: '/user/[id]', params: { id: sheet.user.id } }) },
          ...(!sheet.isOwner && sheet.user.id !== me?.id ? [{
            label: t('ag.removeHost'), danger: true,
            onPress: () => setConfirm({ title: t('ag.removeHost'), body: t('ag.removeConfirm', { name: sheet.user.name }), label: t('ag.removeHost'), danger: true, run: () => act('rm', () => api(`/agencies/members/${sheet.user.id}`, { method: 'DELETE' }), t('ag.removed')) }),
          }] : []),
        ] : []}
      />
      <ConfirmSheet visible={!!confirm} title={confirm?.title ?? ''} body={confirm?.body} confirm={confirm?.label ?? ''} danger={confirm?.danger} onClose={() => setConfirm(null)} onConfirm={() => void confirm?.run()} />
    </Screen>
  );
}

/* ───────────────────────── Host görünüşü ───────────────────────── */
function MemberView({ d, reload }: { d: MyAgency; reload: () => Promise<void> }) {
  const { t } = useTranslation();
  const { toast } = useStore();
  const a = d.agency!;
  const [ask, setAsk] = useState(false);
  async function leave() {
    try {
      await api('/agencies/leave', { body: {} });
      toast(t('ag.left'), 'success');
      await reload();
    } catch (e) {
      toast(errorText(e), 'error');
    }
  }
  return (
    <Screen scroll>
      <Header title={t('ag.myAgency')} />
      <View style={styles.memberHero}>
        <View style={[styles.logo, { backgroundColor: tintFor(a.name) }]}>
          {a.logoUrl ? <Image source={{ uri: a.logoUrl }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Text style={styles.logoText}>{a.name.slice(0, 1)}</Text>}
        </View>
        <Text style={styles.memberName}>{a.name}</Text>
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          <View style={[styles.tierPill, { backgroundColor: TIER_COLORS[a.tier - 1] ?? TIER_COLORS[0] }]}>
            <Icon name="trophy" size={11} color={colors.ink} />
            <Text style={styles.tierPillText}>{t(`ag.tiers.${a.tier}`)}</Text>
          </View>
          <T v="small" color={colors.nightMuted}>{t('agency.hostsCount', { n: a.members })}{a.city ? ` · ${a.city}` : ''}</T>
        </View>
        {d.joinedAt ? <T v="tiny" color={colors.nightMuted}>{t('ag.member')} · {t('ag.memberSince', { d: dateOnly(d.joinedAt) })}</T> : null}
      </View>

      <View style={styles.terms}>
        {[[t('agency.hostShareShort'), `${Math.round(a.hostShare * 100)}%`], [t('agency.code'), a.code]].map(([k, v]) => (
          <View key={k} style={styles.term}><Text style={styles.termNum} numberOfLines={1}>{v}</Text><T v="tiny" color={colors.textMuted}>{k}</T></View>
        ))}
      </View>
      {a.status !== 'ACTIVE' ? <View style={[styles.banner, { backgroundColor: colors.brandSoft, marginTop: 12 }]}><Icon name="ban" size={18} color={colors.ink} /><T v="bodyStrong" style={{ flex: 1 }}>{t('ag.statusSuspended')}</T></View> : null}

      {a.owner ? (
        <>
          <SectionTitle title={t('ag.ownerContact')} />
          <PressBox r={radius.lg} sh={1} onPress={() => router.push({ pathname: '/user/[id]', params: { id: a.owner!.id } })} inner={styles.ownerRow}>
            <Avatar uri={a.owner.avatarUrl} name={a.owner.name} size={44} online={a.owner.online} />
            <T v="bodyStrong" style={{ flex: 1 }}>{a.owner.name}</T>
            <Icon name="chat" size={18} color={colors.textMuted} />
          </PressBox>
        </>
      ) : null}

      <View style={{ gap: 10, marginTop: 20 }}>
        <Btn icon="diamond" title={t('ag.myEarnings')} onPress={() => router.push('/earnings')} />
        <Btn kind="ghost" icon="exit" title={t('ag.leave')} onPress={() => setAsk(true)} />
      </View>
      <ConfirmSheet visible={ask} title={t('ag.leave')} body={t('ag.leaveConfirm', { n: d.cooldownDays })} confirm={t('ag.leave')} danger onClose={() => setAsk(false)} onConfirm={() => void leave()} />
    </Screen>
  );
}

/* ───────────────────────── Qoşulma / yaratma ───────────────────────── */
function JoinView({ d, initialCode, reload }: { d: MyAgency; initialCode: string; reload: () => Promise<void> }) {
  const { t } = useTranslation();
  const { me, toast } = useStore();
  const [mode, setMode] = useState<'join' | 'create'>('join');
  const [code, setCode] = useState(initialCode.toUpperCase());
  const [preview, setPreview] = useState<{ name: string; members: number; tier: number; city: string; logoUrl: string | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [form, setForm] = useState({ city: '', contactName: '', contactPhone: '', expectedHosts: '', experience: '', description: '' });

  useEffect(() => {
    setPreview(null);
    if (code.trim().length < 6) return;
    const id = setTimeout(() => {
      void api<NonNullable<typeof preview>>(`/agencies/public/${encodeURIComponent(code.trim())}`).then(setPreview).catch(() => setPreview(null));
    }, 300);
    return () => clearTimeout(id);
  }, [code]);

  async function act(fn: () => Promise<unknown>, ok?: string) {
    setBusy(true);
    try {
      await fn();
      if (ok) toast(ok, 'success');
      await reload();
    } catch (e) {
      toast(errorText(e), 'error');
    } finally {
      setBusy(false);
    }
  }
  if (!me) return null;
  const req = d.request;
  const pending = req?.status === 'PENDING';

  return (
    <Screen scroll>
      <Header title={t('agency.title')} />
      <View style={styles.joinHero}>
        <View style={styles.heroIcon}><Icon name="business" size={26} color={colors.ink} /></View>
        <T v="h2">{t('ag.joinTitle')}</T>
        <T v="small" color={colors.textMuted}>{t('ag.joinSub')}</T>
      </View>

      {d.cooldownUntil ? (
        <View style={[styles.banner, { backgroundColor: colors.coinSoft, marginTop: 12 }]}>
          <Icon name="time" size={18} color={colors.ink} />
          <T v="bodyStrong" style={{ flex: 1 }}>{t('ag.cooldown', { d: dateOnly(d.cooldownUntil) })}</T>
        </View>
      ) : null}
      {req && (pending || (req.status === 'REJECTED' && req.rejectReason !== 'CANCELLED')) ? (
        <View style={[styles.banner, { backgroundColor: pending ? colors.skySoft : colors.brandSoft, marginTop: 12 }]}>
          <Icon name={pending ? 'time' : 'close'} size={18} color={colors.ink} />
          <View style={{ flex: 1, gap: 2 }}>
            <T v="bodyStrong">{pending ? t('ag.pendingAt', { name: req.agency.name }) : t('ag.rejectedAt', { name: req.agency.name })}</T>
            {!pending && req.rejectReason ? <T v="tiny" color={colors.textMuted}>{t('ag.reason', { r: req.rejectReason })}</T> : null}
          </View>
          {pending ? <Pressable onPress={() => void act(() => api('/agencies/my-request', { method: 'DELETE' }))}><T v="tiny" color={colors.danger}>{t('ag.cancelRequest')}</T></Pressable> : null}
        </View>
      ) : null}

      <View style={{ marginVertical: 16 }}>
        <Tabs value={mode} onChange={setMode} options={[{ key: 'join', label: t('agency.join') }, { key: 'create', label: t('agency.create') }]} />
      </View>
      {mode === 'join' ? (
        <View style={{ gap: 12 }}>
          <Input label={t('ag.codePh')} value={code} onChangeText={(v) => setCode(v.toUpperCase().replace(/[^A-Z0-9]/g, ''))} autoCapitalize="characters" placeholder="ABC234" maxLength={12} />
          {preview ? (
            <View style={styles.preview}>
              <View style={[styles.logoSm, { backgroundColor: tintFor(preview.name) }]}>
                {preview.logoUrl ? <Image source={{ uri: preview.logoUrl }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Text style={styles.logoSmText}>{preview.name.slice(0, 1)}</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <T v="tiny" color={colors.online}>✓ {t('ag.preview')}</T>
                <T v="bodyStrong">{preview.name}</T>
                <T v="tiny" color={colors.textMuted}>{t(`ag.tiers.${preview.tier}`)} · {t('agency.hostsCount', { n: preview.members })}</T>
              </View>
            </View>
          ) : null}
          <Btn kind="dark" title={t('ag.sendRequest')} loading={busy} disabled={code.length < 4 || pending || !!d.cooldownUntil} onPress={() => void act(() => api('/agencies/join', { body: { code } }), t('agency.joinSent'))} />
          <T v="label" color={colors.textMuted} style={{ marginTop: 8 }}>{t('agency.browse')}</T>
          <Btn kind="light" title={t('agency.browse')} icon="search" onPress={() => router.push('/agencies')} />
          <PressBox r={radius.lg} sh={1} onPress={() => router.push('/host-tasks')} inner={styles.taskRow}>
            <Icon name="checkmark" size={18} color={colors.online} />
            <T v="bodyStrong" style={{ flex: 1 }}>{t('hostTasks.title')}</T>
            <Icon name="chevron" size={16} color={colors.textDim} />
          </PressBox>
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
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: radius.md, marginBottom: 12 },
  hero: { backgroundColor: colors.night, borderRadius: radius.xl, padding: 20, overflow: 'hidden', marginTop: 12, gap: 2 },
  heroGlow: { position: 'absolute', right: -70, top: -70, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(205,184,255,0.12)' },
  heroNum: { ...noPad, color: colors.white, fontFamily: fonts.displayBlack, fontSize: 40, lineHeight: 46, letterSpacing: -1.4, marginTop: 8 },
  heroSplit: { flexDirection: 'row', marginTop: 14, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 16, padding: 12 },
  heroDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginHorizontal: 12 },
  heroSmall: { ...noPad, color: colors.white, fontFamily: fonts.display, fontSize: 18, lineHeight: 23 },
  tierPill: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 22, borderRadius: 11, paddingHorizontal: 8 },
  tierPillText: { ...noPad, fontFamily: fonts.black, fontSize: 11, lineHeight: 14, color: colors.ink },
  block: { padding: 16, gap: 10, marginTop: 12 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  codeBox: { backgroundColor: colors.bgSunken, borderRadius: radius.sm, padding: 14, gap: 4, alignItems: 'center' },
  code: { ...noPad, fontFamily: fonts.displayBlack, fontSize: 30, lineHeight: 36, letterSpacing: 6, color: colors.ink },
  reqRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderColor: colors.hairline },
  pill: { height: 30, paddingHorizontal: 14, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  pillText: { ...noPad, color: colors.white, fontFamily: fonts.bold, fontSize: 12, lineHeight: 15 },
  hostRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderColor: colors.hairline },
  rank: { ...noPad, width: 18, textAlign: 'center', fontFamily: fonts.black, fontSize: 13, lineHeight: 17, color: colors.textDim },
  metric: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  memberHero: { backgroundColor: colors.night, borderRadius: radius.xl, padding: 20, alignItems: 'center', gap: 8 },
  logo: { width: 76, height: 76, borderRadius: 24, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  logoText: { ...noPad, fontFamily: fonts.displayBlack, fontSize: 32, lineHeight: 38, color: colors.ink },
  memberName: { ...noPad, fontFamily: fonts.display, fontSize: 24, lineHeight: 30, color: colors.white, textAlign: 'center' },
  terms: { flexDirection: 'row', gap: 10, marginTop: 12 },
  term: { flex: 1, backgroundColor: colors.card, borderRadius: radius.md, padding: 12, alignItems: 'center', gap: 2 },
  termNum: { ...noPad, fontFamily: fonts.display, fontSize: 17, lineHeight: 22, color: colors.ink },
  ownerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  joinHero: { backgroundColor: colors.lilac, borderRadius: 26, padding: 20, gap: 10 },
  heroIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  preview: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.md, backgroundColor: colors.onlineSoft },
  logoSm: { width: 44, height: 44, borderRadius: 14, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  logoSmText: { ...noPad, fontFamily: fonts.displayBlack, fontSize: 20, lineHeight: 25, color: colors.ink },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
});
