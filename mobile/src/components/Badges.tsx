import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, fonts, palette, vipColor } from '../theme';
import { Icon } from './Icon';
import { CoinIcon, DiamondIcon } from './GiftIcon';
import { Tag } from './ui';

/** Sərvət (xərclənən) və cazibə (qazanılan) səviyyələri — düz rəngli stikerlər */
export function LevelBadge({ level, kind }: { level: number; kind: 'wealth' | 'charm' }) {
  if (level <= 0) return null;
  return kind === 'wealth'
    ? <Tag label={`Lv${level}`} icon="diamond" bg={palette.saffronSoft} />
    : <Tag label={`Lv${level}`} icon="heart" bg={palette.narSoft} />;
}

export function VipBadge({ tier }: { tier: string }) {
  const { t } = useTranslation();
  if (!tier || tier === 'NONE') return null;
  const c = vipColor(tier);
  return <Tag label={t(`vip.tiers.${tier}`).toUpperCase()} icon="crown" bg={c.bg} fg={c.fg} />;
}

export function VerifiedBadge({ size = 16, color = colors.diamond }: { size?: number; color?: string }) {
  return <Icon name="verified" size={size} color={color} />;
}

export function HostBadge() {
  const { t } = useTranslation();
  return <Tag label={t('profile.host').toUpperCase()} icon="sparkles" bg={colors.ink} fg={colors.bg} />;
}

export function CoinAmount({ n, size = 16, color = colors.ink }: { n: number | string; size?: number; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <CoinIcon size={size} />
      <Text style={{ color, fontFamily: fonts.black, fontSize: size * 0.9 }}>{n}</Text>
    </View>
  );
}

export function DiamondAmount({ n, size = 16, color = colors.ink }: { n: number | string; size?: number; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <DiamondIcon size={size} />
      <Text style={{ color, fontFamily: fonts.black, fontSize: size * 0.9 }}>{n}</Text>
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
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingLeft: 10, paddingRight: 5, borderRadius: 20, backgroundColor: colors.coinSoft, borderWidth: 2, borderColor: colors.ink },
  text: { fontFamily: fonts.black, fontSize: 14, color: colors.ink },
  plus: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.coin, borderWidth: 1.5, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
});
