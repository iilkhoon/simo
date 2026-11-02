import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { colors, fonts, tintFor, vipColor } from '../theme';

/** Avatar: VIP — rəngli halqa; canlı — Nar halqa + "LIVE" həbi */
export function Avatar({ uri, size = 48, online, vipTier, name, live, ring = true }: {
  uri?: string | null; size?: number; online?: boolean; vipTier?: string; name?: string; live?: boolean; ring?: boolean;
}) {
  const vip = vipTier && vipTier !== 'NONE';
  const ringColor = live ? colors.brand : vip ? vipColor(vipTier).bg : null;
  const bw = size >= 64 ? 3 : 2;
  const pad = ringColor && ring ? 3 : 0;
  return (
    <View style={{ width: size + pad * 2, height: size + pad * 2 }}>
      <View style={[styles.ring, { padding: pad, borderRadius: size, borderColor: ringColor ?? 'transparent', borderWidth: pad ? bw : 0 }]}>
        <View style={{ width: size - (pad ? bw * 2 : 0), height: size - (pad ? bw * 2 : 0), borderRadius: size, overflow: 'hidden', backgroundColor: tintFor(name), alignItems: 'center', justifyContent: 'center' }}>
          {uri ? (
            <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
          ) : (
            <Text style={{ color: colors.ink, fontSize: size * 0.38, fontFamily: fonts.display }}>{(name ?? '?').slice(0, 1).toUpperCase()}</Text>
          )}
        </View>
      </View>
      {online && !live ? <View style={[styles.dot, { width: Math.max(10, size * 0.24), height: Math.max(10, size * 0.24), borderRadius: size }]} /> : null}
      {live ? (
        <View style={styles.live}>
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  ring: { borderColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', right: 1, bottom: 1, backgroundColor: colors.online, borderWidth: 2.5, borderColor: colors.card },
  live: { position: 'absolute', bottom: -6, alignSelf: 'center', paddingHorizontal: 5, height: 15, justifyContent: 'center', borderRadius: 5, backgroundColor: colors.brand, borderWidth: 2, borderColor: colors.card },
  liveText: { color: colors.white, fontSize: 8, fontFamily: fonts.black, letterSpacing: 0.6 },
});
