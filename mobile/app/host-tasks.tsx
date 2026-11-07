import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, fonts, noPad, radius } from '@/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { Btn, GradientCard, Header, Loader, PressBox, Screen, T } from '@/components/ui';
import { Appear } from '@/components/motion';
import { Icon, type IconName } from '@/components/Icon';
import { Illustration } from '@/components/Illustration';
import { gradients } from '@/theme';
import { api } from '@/lib/api';

interface Item { key: string; done: boolean; value: number; target: number; status?: string }

const META: Record<string, { icon: IconName; href?: Href }> = {
  accountAge: { icon: 'calendar' },
  chatPartners: { icon: 'chat', href: '/(tabs)' },
  profile: { icon: 'person', href: '/edit-profile' },
  firstPost: { icon: 'video', href: { pathname: '/video/upload', params: { type: 'VIDEO' } } },
  kyc: { icon: 'shield', href: '/verify' },
};

/** Host olmaq yolu: hesabı istifadə et → tapşırıqları tamamla → agentliyə müraciət et */
export default function HostTasks() {
  const { t } = useTranslation();
  const [d, setD] = useState<{ eligible: boolean; items: Item[] } | null>(null);
  useFocusEffect(useCallback(() => { void api<NonNullable<typeof d>>('/host/requirements').then(setD).catch(() => {}); }, []));
  if (!d) return <Screen><Header title={t('hostTasks.title')} /><Loader full variant="list" n={5} /></Screen>;
  const doneN = d.items.filter((i) => i.done).length;
  return (
    <Screen scroll>
      <Header title={t('hostTasks.title')} />
      <Appear i={0}>
        <GradientCard g="night" glow={colors.coin} shine={d.eligible} inner={styles.hero}>
          <Illustration name={d.eligible ? 'crown' : 'trophy'} size={96} bare />
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={styles.heroTitle}>{d.eligible ? t('hostTasks.ready') : t('hostTasks.progress', { done: doneN, total: d.items.length })}</Text>
            <T v="small" color={colors.nightMuted}>{t('hostTasks.sub')}</T>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.max(4, (doneN / Math.max(1, d.items.length)) * 100)}%` }]}>
                <LinearGradient colors={gradients.gold as unknown as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
              </View>
            </View>
          </View>
        </GradientCard>
      </Appear>
      <View style={{ gap: 10, marginTop: 14 }}>
        {d.items.map((it, idx) => {
          const m = META[it.key] ?? { icon: 'checkmark' as IconName };
          return (
            <Appear key={it.key} i={idx + 1}>
            <PressBox r={radius.lg} sh={1} disabled={it.done || !m.href} onPress={() => m.href && router.push(m.href)} inner={styles.row}>
              <View style={[styles.icon, { backgroundColor: it.done ? colors.onlineSoft : colors.bgSunken }]}>
                <Icon name={it.done ? 'checkmark' : m.icon} size={18} color={it.done ? colors.online : colors.ink} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <T v="bodyStrong">{t(`hostTasks.items.${it.key}`, { n: it.target })}</T>
                <T v="tiny" color={colors.textMuted}>
                  {it.key === 'kyc' ? t(`kyc.status.${it.status ?? 'NONE'}`) : `${Math.min(it.value, it.target)} / ${it.target}`}
                </T>
              </View>
              {!it.done && m.href ? <Icon name="chevron" size={16} color={colors.textDim} /> : null}
            </PressBox>
            </Appear>
          );
        })}
      </View>
      <Btn style={{ marginTop: 20 }} title={t('agency.browse')} icon="business" disabled={!d.eligible} onPress={() => router.push('/agencies')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  heroTitle: { ...noPad, fontFamily: fonts.display, fontSize: 19, lineHeight: 24, color: colors.white },
  track: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.14)', overflow: 'hidden', marginTop: 4 },
  fill: { height: '100%', borderRadius: 4, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  icon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
});
