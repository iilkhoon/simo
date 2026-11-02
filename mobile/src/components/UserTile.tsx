import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { PublicUser } from '../lib/types';
import { colors, fonts, radius, tintFor } from '../theme';
import { VerifiedBadge } from './Badges';
import { PressBox } from './ui';

/** Şəbəkə kartı: foto + aşağıda ağ "etiket" zolağı (stiker estetikası) */
export function UserTile({ user, width, height = width * 1.32, blurred }: { user: Partial<PublicUser> & { avatarUrl: string | null }; width: number; height?: number; blurred?: boolean }) {
  const { t } = useTranslation();
  const sh = 3;
  return (
    <PressBox
      disabled={blurred || !user.id}
      onPress={() => router.push({ pathname: '/user/[id]', params: { id: user.id! } })}
      r={radius.md}
      sh={sh}
      bg={tintFor(user.name ?? user.id)}
      style={{ width }}
      inner={{ height: height - sh }}
    >
      {user.avatarUrl ? <Image source={{ uri: user.avatarUrl }} style={StyleSheet.absoluteFill} contentFit="cover" blurRadius={blurred ? 28 : 0} /> : null}
      {user.online && !blurred ? <View style={styles.online} /> : null}
      <View style={styles.info}>
        {!blurred ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Text style={styles.name} numberOfLines={1}>{user.name}{user.age ? `, ${user.age}` : ''}</Text>
              {user.verified ? <VerifiedBadge size={12} /> : null}
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
  info: { position: 'absolute', left: 6, right: 6, bottom: 6, paddingHorizontal: 7, paddingVertical: 5, backgroundColor: colors.card, borderRadius: 9, borderWidth: 1.5, borderColor: colors.ink },
  name: { color: colors.ink, fontFamily: fonts.bold, fontSize: 12.5, flexShrink: 1 },
  sub: { color: colors.textMuted, fontFamily: fonts.medium, fontSize: 10.5 },
  online: { position: 'absolute', top: 7, right: 7, width: 11, height: 11, borderRadius: 6, backgroundColor: colors.online, borderWidth: 2, borderColor: colors.ink },
});
