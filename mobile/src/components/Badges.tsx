import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, fonts, noPad, palette, vipColor } from '../theme';
import { Icon, type IconName } from './Icon';
import { CoinIcon, DiamondIcon } from './GiftIcon';
import { fmtAlmaz } from '../lib/economy';

/**
 * Nişanlar — vahid dizayn: hündürlük 22, tam yumru həb, solda tünd dairədə emblem, sağda mətn.
 * Səxavət (xərclənən) və Şöhrət (qazanılan) səviyyələri rəng pillələri ilə dəyişir.
 */
function Pill({ bg, fg = colors.white, disc, icon, label, iconColor }: { bg: string; fg?: string; disc: string; icon: IconName; label: string; iconColor?: string }) {
  return (
    <View style={[pill.wrap, { backgroundColor: bg }]}>
      <View style={[pill.disc, { backgroundColor: disc }]}><Icon name={icon} size={11} color={iconColor ?? fg} /></View>
      <Text style={[pill.text, { color: fg }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

const WEALTH = [[50, '#1A1512', '#FFC23D'], [30, '#7C3AED', '#5B21B6'], [20, '#E5484D', '#B4232F'], [10, '#F07A1A', '#C2560A'], [1, '#F5A524', '#C77F00']] as const;
const CHARM = [[50, '#1A1512', '#FF5A72'], [30, '#9333EA', '#6B21A8'], [20, '#D6246E', '#A3134F'], [10, '#F2344F', '#C8203B'], [1, '#FF7AA2', '#E0527C']] as const;

export function LevelBadge({ level, kind }: { level: number; kind: 'wealth' | 'charm' }) {
  if (level <= 0) return null;
  const scale = kind === 'wealth' ? WEALTH : CHARM;
  const [, bg, disc] = scale.find(([min]) => level >= min) ?? scale[scale.length - 1];
  const gold = level >= 50;
  return <Pill bg={bg} disc={disc} icon={kind === 'wealth' ? 'diamond' : 'star'} label={`${level}`} fg={gold ? '#FFC23D' : colors.white} />;
}

export function VipBadge({ tier }: { tier: string }) {
  const { t } = useTranslation();
  if (!tier || tier === 'NONE') return null;
  const c = vipColor(tier);
  return <Pill bg={c.bg} fg={c.fg} disc={tier === 'DIAMOND' ? '#1D4FD8' : tier === 'GOLD' ? '#D98A00' : '#AEB6C2'} icon="crown" label={t(`vip.tiers.${tier}`)} />;
}

const NOBLE: Record<string, { bg: string; disc: string; fg: string }> = {
  BEY: { bg: '#B8733A', disc: '#8A5223', fg: colors.white },
  XAN: { bg: '#6D4AFF', disc: '#4B2FD1', fg: colors.white },
  SAH: { bg: '#1A1512', disc: '#3A2F25', fg: '#FFC23D' },
};

export function NobleBadge({ tier }: { tier?: string | null }) {
  const { t } = useTranslation();
  if (!tier || tier === 'NONE' || !NOBLE[tier]) return null;
  const c = NOBLE[tier];
  return <Pill bg={c.bg} disc={c.disc} fg={c.fg} icon="crown" iconColor={tier === 'SAH' ? '#FFC23D' : colors.white} label={t(`noble.tiers.${tier}`)} />;
}

/** Mavi nişan — "Təsdiqlənmiş profil" (VIP ilə satılır) */
export function VerifiedBadge({ size = 16, color = colors.diamond }: { size?: number; color?: string }) {
  return <Icon name="verified" size={size} color={color} />;
}

/** Yaşıl nişan — şəxsiyyət sənədi ilə təsdiqlənmiş kimlik (KYC). Mavi nişandan ayrıdır və satılmır */
export function IdBadge({ size = 16 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.online, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name="shield" size={size * 0.62} color={colors.white} />
    </View>
  );
}

/** Profildə: hər iki nişan mətnlə */
export function TrustPills({ vip, id }: { vip?: boolean; id?: boolean }) {
  const { t } = useTranslation();
  return (
    <>
      {vip ? <Pill bg={colors.skySoft} fg={colors.ink} disc={colors.diamond} icon="verified" label={t('trust.vipVerified')} /> : null}
      {id ? <Pill bg={colors.onlineSoft} fg={colors.ink} disc={colors.online} icon="shield" label={t('trust.idVerified')} /> : null}
    </>
  );
}

export function HostBadge() {
  const { t } = useTranslation();
  return <Pill bg={colors.ink} disc={colors.brand} icon="mic" label={t('profile.host')} />;
}

/** Profil nişanları: staj, region birinciliyi */
export function ProfileBadge({ b }: { b: { key: string; label?: string; value?: number } }) {
  const { t } = useTranslation();
  if (b.key === 'tenure') return <Pill bg={colors.lilac} fg={colors.ink} disc={palette.lilac} iconColor={colors.ink} icon="time" label={t('badges.tenure', { n: b.value })} />;
  if (b.key === 'cityTop' || b.key === 'countryTop') return <Pill bg={palette.saffron} fg={colors.ink} disc="#D98A00" iconColor={colors.white} icon="trophy" label={`${b.label} #${b.value}`} />;
  if (b.key === 'verified') return <Pill bg={colors.skySoft} fg={colors.ink} disc={palette.xazar} icon="verified" iconColor={colors.white} label={t('badges.verified')} />;
  return null;
}

const pill = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 22, borderRadius: 11, paddingLeft: 2, paddingRight: 8, alignSelf: 'flex-start' },
  disc: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  text: { ...noPad, fontFamily: fonts.black, fontSize: 11, lineHeight: 14, letterSpacing: 0.1 },
});

export function CoinAmount({ n, size = 16, color = colors.ink }: { n: number | string; size?: number; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <CoinIcon size={size} />
      <Text style={{ ...noPad, color, fontFamily: fonts.black, fontSize: size * 0.9, lineHeight: Math.round(size * 1.1) }}>{n}</Text>
    </View>
  );
}

/** Almaz miqdarı: `n` — serverin daxili vahidi (10 = 1 Almaz), burada Almaz kimi göstərilir */
export function DiamondAmount({ n, size = 16, color = colors.ink }: { n: number; size?: number; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <DiamondIcon size={size} />
      <Text style={{ ...noPad, color, fontFamily: fonts.black, fontSize: size * 0.9, lineHeight: Math.round(size * 1.1) }}>{fmtAlmaz(n)}</Text>
    </View>
  );
}

/** Balans həbi — toxunanda pul kisəsi açılır */
export function CoinPill({ n, onPress, night }: { n: number; onPress?: () => void; night?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pillStyles.wrap, night && { borderColor: colors.bg }, pressed && { opacity: 0.8 }]}>
      <CoinIcon size={18} />
      <Text style={pillStyles.text}>{n.toLocaleString('en-US')}</Text>
      <View style={pillStyles.plus}><Icon name="add" size={13} color={colors.ink} /></View>
    </Pressable>
  );
}

const pillStyles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingLeft: 10, paddingRight: 5, borderRadius: 20, backgroundColor: colors.coinSoft },
  text: { ...noPad, fontFamily: fonts.black, fontSize: 14, lineHeight: 18, color: colors.ink },
  plus: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.coin, alignItems: 'center', justifyContent: 'center' },
});
