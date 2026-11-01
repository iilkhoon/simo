import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { colors, gradients, vipGradient } from '../theme';
import { Icon } from './Icon';
import { CoinIcon, DiamondIcon } from './GiftIcon';

export function LevelBadge({ level, kind }: { level: number; kind: 'wealth' | 'charm' }) {
  if (level <= 0) return null;
  const c = kind === 'wealth' ? (['#FFB86B', '#F2711C'] as const) : (['#FF8FB8', '#C850C0'] as const);
  return (
    <LinearGradient colors={c} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.pill}>
      <Icon name={kind === 'wealth' ? 'diamond' : 'heart'} size={10} color="#fff" />
      <Text style={styles.text}>{level}</Text>
    </LinearGradient>
  );
}

export function VipBadge({ tier }: { tier: string }) {
  const { t } = useTranslation();
  if (!tier || tier === 'NONE') return null;
  return (
    <LinearGradient colors={vipGradient(tier)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.pill}>
      <Icon name="crown" size={10} color="#2B1745" />
      <Text style={[styles.text, { color: '#2B1745' }]}>{t(`vip.tiers.${tier}`)}</Text>
    </LinearGradient>
  );
}

export function VerifiedBadge({ size = 16 }: { size?: number }) {
  return <Icon name="verified" size={size} color={colors.diamond} />;
}

export function HostBadge() {
  const { t } = useTranslation();
  return (
    <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.pill}>
      <Icon name="sparkles" size={10} color="#fff" />
      <Text style={styles.text}>{t('profile.host')}</Text>
    </LinearGradient>
  );
}

export function CoinAmount({ n, size = 16, color = colors.gold }: { n: number | string; size?: number; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <CoinIcon size={size} />
      <Text style={{ color, fontWeight: '800', fontSize: size * 0.9 }}>{n}</Text>
    </View>
  );
}

export function DiamondAmount({ n, size = 16 }: { n: number | string; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <DiamondIcon size={size} />
      <Text style={{ color: colors.diamond, fontWeight: '800', fontSize: size * 0.9 }}>{n}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  text: { color: '#fff', fontSize: 10, fontWeight: '800' },
});
