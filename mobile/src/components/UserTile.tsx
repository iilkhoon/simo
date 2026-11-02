import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { PublicUser } from '../lib/types';
import { colors, fonts, radius, tintFor } from '../theme';
import { VerifiedBadge } from './Badges';
import { PressBox } from './ui';

/** Şəbəkə kartı: tam foto + aşağıda ağ yazı (foto-birinci) */
export function UserTile({ user, width, height = width * 1.32, blurred }: { user: Partial<PublicUser> & { avatarUrl: string | null }; width: number; height?: number; blurred?: boolean }) {
  const { t } = useTranslation();
  return (
    <PressBox
      disabled={blurred || !user.id}
      onPress={() => router.push({ pathname: '/user/[id]', params: { id: user.id! } })}
      r={radius.md}
      sh={2}
      bg={tintFor(user.name ?? user.id)}
      style={{ width }}
      inner={{ height }}
    >
      {user.avatarUrl ? <Image source={{ uri: user.avatarUrl }} style={StyleSheet.absoluteFill} contentFit="cover" blurRadius={blurred ? 28 : 0} /> : null}
      <LinearGradient colors={['rgba(16,14,13,0)', 'rgba(16,14,13,0.75)']} style={styles.scrim} pointerEvents="none" />
      {user.online && !blurred ? <View style={styles.online} /> : null}
      <View style={styles.info}>
        {!blurred ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={styles.name} numberOfLines={1}>{user.name}{user.age ? `, ${user.age}` : ''}</Text>
              {user.verified ? <VerifiedBadge size={13} color={colors.sky} /> : null}
            </View>
            {user.distanceKm != null ? <Text style={styles.sub}>{t('common.km', { n: user.distanceKm })}</Text> : user.city ? <Text style={styles.sub} numberOfLines={1}>{user.city}</Text> : null}
          </>
        ) : (
          <Text style={styles.name}>{user.age ? `${user.age}` : '?'} · ?</Text>
        )}
      </View>
    </PressBox>
  );
}

const styles = StyleSheet.create({
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '50%' },
  info: { position: 'absolute', left: 10, right: 10, bottom: 9 },
  name: { color: colors.white, fontFamily: fonts.bold, fontSize: 13.5, flexShrink: 1 },
  sub: { color: 'rgba(255,255,255,0.82)', fontFamily: fonts.medium, fontSize: 11, marginTop: 1 },
  online: { position: 'absolute', top: 8, right: 8, width: 12, height: 12, borderRadius: 6, backgroundColor: colors.online, borderWidth: 2, borderColor: colors.white },
});
