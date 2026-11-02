import { useTranslation } from 'react-i18next';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { colors, fonts, tintFor, vipColor } from '../theme';

/**
 * Avatar: VIP — rəngli halqa; canlı — Nar halqa + "LIVE" həbi.
 * Xarici ölçü HƏMİŞƏ `size`-dır (halqa içəri çəkilir) — halqalı və halqasız avatarlar eyni yer tutur, sıralar düz düzülür.
 */
export function Avatar({ uri, size = 48, online, vipTier, name, live, ring = true }: {
  uri?: string | null; size?: number; online?: boolean; vipTier?: string; name?: string; live?: boolean; ring?: boolean;
}) {
  const { t } = useTranslation();
  const vip = vipTier && vipTier !== 'NONE';
  const ringColor = ring ? (live ? colors.brand : vip ? vipColor(vipTier).bg : null) : null;
  const bw = size >= 64 ? 3 : size >= 36 ? 2 : 1.5;
  const gap = size >= 36 ? 2 : 1.5;
  const inner = ringColor ? size - 2 * (bw + gap) : size;
  const dot = Math.max(10, Math.round(size * 0.24));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {ringColor ? <View style={[StyleSheet.absoluteFill, { borderRadius: size, borderWidth: bw, borderColor: ringColor }]} /> : null}
      <View style={{ width: inner, height: inner, borderRadius: inner, overflow: 'hidden', backgroundColor: tintFor(name), alignItems: 'center', justifyContent: 'center' }}>
        {uri ? (
          <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
        ) : (
          <Text style={{ color: colors.ink, fontSize: inner * 0.4, lineHeight: inner * 0.5, fontFamily: fonts.display }}>{(name ?? '?').slice(0, 1).toUpperCase()}</Text>
        )}
      </View>
      {online && !live ? <View style={[styles.dot, { width: dot, height: dot, borderRadius: dot }]} /> : null}
      {live ? (
        <View style={styles.live}>
          <Text style={styles.liveText}>{t('tags.live')}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  dot: { position: 'absolute', right: 1, bottom: 1, backgroundColor: colors.online, borderWidth: 2.5, borderColor: colors.card },
  live: { position: 'absolute', bottom: -6, alignSelf: 'center', paddingHorizontal: 5, height: 15, alignItems: 'center', justifyContent: 'center', borderRadius: 6, backgroundColor: colors.brand, borderWidth: 2, borderColor: colors.card },
  liveText: { color: colors.white, fontSize: 8, lineHeight: 10, fontFamily: fonts.black, letterSpacing: 0.6 },
});
