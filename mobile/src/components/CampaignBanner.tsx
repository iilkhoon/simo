/**
 * Mövsümi kampaniya banneri (Novruz, 8 Mart, 14 Fevral...). Gedən və ya yaxınlaşan kampaniya yoxdursa heç nə göstərmir.
 * Ana səhifəyə və istənilən siyahının başına bir sətirlə qoyulur: <CampaignBanner />
 */
import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { fonts } from '../theme';
import { Pressable3, Shine } from './motion';
import { GiftIcon } from './GiftIcon';
import { leftText, loc, useCampaigns } from '../lib/campaigns';

export function CampaignBanner({ style }: { style?: StyleProp<ViewStyle> }) {
  const { t } = useTranslation();
  const c = useCampaigns().find((x) => x.status !== 'ended');
  if (!c) return null;
  const live = c.status === 'live';
  return (
    <Pressable3 scaleTo={0.97} onPress={() => router.push({ pathname: '/campaign/[id]', params: { id: c.id } })} style={[styles.wrap, style]}>
      <LinearGradient colors={[c.color, c.color2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      {c.imageUrl ? <Image source={{ uri: c.imageUrl }} style={[StyleSheet.absoluteFill, { opacity: 0.35 }]} contentFit="cover" /> : null}
      <Shine />
      <Text style={styles.emoji}>{c.emoji}</Text>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.pillRow}>
          <View style={styles.pill}><Text style={styles.pillText}>{live ? `● ${t('growth.live')}` : t('growth.upcoming')}</Text></View>
          <Text style={styles.left} numberOfLines={1}>{live ? t('growth.endsIn', { t: leftText(c.endsAt) }) : t('growth.startsIn', { t: leftText(c.startsAt) })}</Text>
        </View>
        <Text style={styles.title} numberOfLines={1}>{loc(c.title)}</Text>
        {loc(c.subtitle) ? <Text style={styles.sub} numberOfLines={1}>{loc(c.subtitle)}</Text> : null}
      </View>
      <View style={styles.gifts}>
        {c.giftIds.slice(0, 2).map((g, i) => <View key={g} style={{ marginLeft: i ? -14 : 0 }}><GiftIcon id={g} size={40} /></View>)}
      </View>
    </Pressable3>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 24, overflow: 'hidden', marginBottom: 12, minHeight: 84 },
  emoji: { fontSize: 34 },
  pillRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  pill: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  pillText: { color: '#fff', fontFamily: fonts.bold, fontSize: 10.5 },
  left: { color: 'rgba(255,255,255,0.92)', fontFamily: fonts.semibold, fontSize: 11, flexShrink: 1 },
  title: { color: '#fff', fontFamily: fonts.black, fontSize: 17 },
  sub: { color: 'rgba(255,255,255,0.9)', fontFamily: fonts.semibold, fontSize: 12, marginTop: 1 },
  gifts: { flexDirection: 'row', alignItems: 'center' },
});
