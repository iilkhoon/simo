import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { PublicUser } from '../lib/types';
import { colors, gradients, radius } from '../theme';
import { VerifiedBadge } from './Badges';

export function UserTile({ user, width, height = width * 1.35, blurred }: { user: Partial<PublicUser> & { avatarUrl: string | null }; width: number; height?: number; blurred?: boolean }) {
  const { t } = useTranslation();
  return (
    <Pressable
      disabled={blurred || !user.id}
      onPress={() => router.push({ pathname: '/user/[id]', params: { id: user.id! } })}
      style={[styles.tile, { width, height }]}
    >
      {user.avatarUrl ? <Image source={{ uri: user.avatarUrl }} style={StyleSheet.absoluteFill} contentFit="cover" blurRadius={blurred ? 25 : 0} /> : null}
      <LinearGradient colors={gradients.card} style={styles.info}>
        {!blurred ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              {user.online ? <View style={styles.dot} /> : null}
              <Text style={styles.name} numberOfLines={1}>{user.name}{user.age ? `, ${user.age}` : ''}</Text>
              {user.verified ? <VerifiedBadge size={13} /> : null}
            </View>
            {user.distanceKm != null ? <Text style={styles.sub}>{t('common.km', { n: user.distanceKm })}</Text> : user.city ? <Text style={styles.sub}>{user.city}</Text> : null}
          </>
        ) : (
          <Text style={styles.name}>{user.age ? `${user.age}` : '?'}</Text>
        )}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: { borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surface2 },
  info: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 8, paddingTop: 30 },
  name: { color: '#fff', fontWeight: '700', fontSize: 14, flexShrink: 1 },
  sub: { color: colors.textMuted, fontSize: 11, marginTop: 1 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.online },
});
