import React, { useCallback, useEffect, useState } from 'react';
import { Dimensions, FlatList, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, gradients, radius } from '../theme';
import { api } from '../lib/api';
import type { PublicUser } from '../lib/types';
import { EmptyState, GradientButton, Header, Loader, Screen } from './ui';
import { UserTile } from './UserTile';

const TW = (Dimensions.get('window').width - 32 - 20) / 3;

/** "Məni bəyənənlər" və "Profilimə baxanlar" — VIP olmayanlara bulanıq göstərilir (maraq oyadır) */
export function LockedGrid({ endpoint, title, lockedText, emptyTitle }: { endpoint: string; title: string; lockedText: (n: number) => string; emptyTitle: string }) {
  const { t } = useTranslation();
  const [data, setData] = useState<{ locked: boolean; total: number; items: { user: PublicUser; super?: boolean }[] } | null>(null);
  const load = useCallback(() => void api<NonNullable<typeof data>>(endpoint).then(setData).catch(() => setData({ locked: false, total: 0, items: [] })), [endpoint]);
  useEffect(load, [load]);
  return (
    <Screen>
      <Header title={title} />
      {!data ? <Loader full /> : (
        <>
          {data.locked && data.total > 0 ? (
            <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.banner}>
              <Text style={styles.bannerText}>{lockedText(data.total)}</Text>
              <GradientButton small title={`👑 ${t('likes.unlock')}`} colors={gradients.vipGold} textStyle={{ color: '#3A1F00' }} onPress={() => router.push('/vip')} />
            </LinearGradient>
          ) : null}
          <FlatList
            data={data.items}
            numColumns={3}
            keyExtractor={(x, i) => (x.user.id || 'l') + i}
            columnWrapperStyle={{ gap: 10 }}
            contentContainerStyle={{ gap: 10, flexGrow: 1, paddingBottom: 30 }}
            ListEmptyComponent={<EmptyState icon="heart" title={emptyTitle} />}
            renderItem={({ item }) => (
              <View>
                <UserTile user={item.user as PublicUser} width={TW} blurred={data.locked} />
                {item.super ? <View style={styles.super}><Text style={{ fontSize: 12 }}>⭐</Text></View> : null}
              </View>
            )}
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: { borderRadius: radius.lg, padding: 16, gap: 12, marginBottom: 14, alignItems: 'center' },
  bannerText: { color: '#fff', fontWeight: '800', fontSize: 16, textAlign: 'center' },
  super: { position: 'absolute', top: 6, right: 6, backgroundColor: colors.bg, borderRadius: 10, padding: 2 },
});
