import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, vipGradient } from '../theme';

export function Avatar({ uri, size = 48, online, vipTier, name, live }: {
  uri?: string | null; size?: number; online?: boolean; vipTier?: string; name?: string; live?: boolean;
}) {
  const ring = live ? gradients.primary : vipTier && vipTier !== 'NONE' ? vipGradient(vipTier) : null;
  const inner = (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }}>
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size }} contentFit="cover" transition={150} />
      ) : (
        <Text style={{ color: colors.textMuted, fontSize: size * 0.4, fontWeight: '700' }}>{(name ?? '?').slice(0, 1).toUpperCase()}</Text>
      )}
    </View>
  );
  return (
    <View style={{ width: size + (ring ? 6 : 0), height: size + (ring ? 6 : 0) }}>
      {ring ? (
        <LinearGradient colors={ring} style={{ padding: 3, borderRadius: size }}>
          {inner}
        </LinearGradient>
      ) : (
        inner
      )}
      {online ? <View style={[styles.dot, { width: size * 0.26, height: size * 0.26, borderRadius: size * 0.13 }]} /> : null}
      {live ? (
        <LinearGradient colors={gradients.primary} style={styles.live}>
          <Text style={styles.liveText}>LIVE</Text>
        </LinearGradient>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  dot: { position: 'absolute', right: 1, bottom: 1, backgroundColor: colors.online, borderWidth: 2, borderColor: colors.bg },
  live: { position: 'absolute', bottom: -4, alignSelf: 'center', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 },
  liveText: { color: '#fff', fontSize: 9, fontWeight: '900' },
});
