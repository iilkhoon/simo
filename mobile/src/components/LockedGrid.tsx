import React, { useCallback, useEffect, useState } from 'react';
import { Dimensions, FlatList, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme';
import { api } from '../lib/api';
import type { PublicUser } from '../lib/types';
import { Btn, EmptyState, GradientCard, Header, Loader, Screen, T, Tag } from './ui';
import { Illustration } from './Illustration';
import { Appear } from './motion';
import { UserTile } from './UserTile';

const TW = (Dimensions.get('window').width - 32 - 16) / 3;

/** "Məni bəyənənlər" və "Profilimə baxanlar" — VIP olmayanlara bulanıq göstərilir (maraq oyadır) */
export function LockedGrid({ endpoint, title, lockedText, emptyTitle, emptySub }: { endpoint: string; title: string; lockedText: (n: number) => string; emptyTitle: string; emptySub?: string }) {
  const { t } = useTranslation();
  const [data, setData] = useState<{ locked: boolean; total: number; items: { user: PublicUser; super?: boolean }[] } | null>(null);
  const load = useCallback(() => void api<NonNullable<typeof data>>(endpoint).then(setData).catch(() => setData({ locked: false, total: 0, items: [] })), [endpoint]);
  useEffect(load, [load]);
  return (
    <Screen>
      <Header title={title} />
      {!data ? <Loader full variant="grid" n={9} width={TW} /> : (
        <>
          {data.locked && data.total > 0 ? (
            <Appear>
              <GradientCard g="gold" glow={colors.white} shine r={24} style={{ marginBottom: 16 }} inner={{ padding: 16, gap: 12, flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1, gap: 12 }}>
                  <T v="h3">{lockedText(data.total)}</T>
                  <Btn kind="dark" size="md" icon="crown" full={false} style={{ alignSelf: 'flex-start' }} title={t('likes.unlock')} onPress={() => router.push('/vip')} />
                </View>
                <Illustration name={endpoint.includes('visitors') ? 'eye' : 'heart'} bare size={84} />
              </GradientCard>
            </Appear>
          ) : null}
          <FlatList
            data={data.items}
            numColumns={3}
            keyExtractor={(x, i) => (x.user.id || 'l') + i}
            columnWrapperStyle={{ gap: 8 }}
            contentContainerStyle={{ gap: 8, flexGrow: 1, paddingBottom: 30 }}
            ListEmptyComponent={<EmptyState icon={endpoint.includes("visitors") ? "eye" : "heart"} title={emptyTitle} sub={emptySub} />}
            renderItem={({ item, index }) => (
              <Appear i={index}>
                <UserTile user={item.user as PublicUser} width={TW} blurred={data.locked} />
                {item.super ? <Tag label="SUPER" icon="star" bg={colors.diamond} fg={colors.white} style={{ position: 'absolute', top: 6, left: 6 }} /> : null}
              </Appear>
            )}
          />
        </>
      )}
    </Screen>
  );
}
