import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, fonts, noPad, radius as R } from '@/theme';
import { Btn, EmptyState, Header, Loader, Screen } from '@/components/ui';
import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { UserTile } from '@/components/UserTile';
import { api } from '@/lib/api';
import { syncLocation } from '@/lib/media';
import { useStore } from '@/store';
import type { PublicUser } from '@/lib/types';

const W = Dimensions.get('window').width;
const TW = (W - 32 - 10) / 2;
const RADII = [5, 20, 50, 200] as const;
const RADAR = Math.min(W - 32, 360);

/**
 * Yaxınlıqdakılar: radar (ən yaxın 8 nəfər məsafəyə görə halqalarda), radius və "indi onlayn" filtri, altda şəbəkə.
 * Məsafə 1 km dəqiqliyə yuvarlaqlaşdırılır — dəqiq yer heç vaxt göstərilmir.
 */
export default function Nearby() {
  const { t } = useTranslation();
  const me = useStore((s) => s.me);
  const [radius, setRadius] = useState<(typeof RADII)[number]>(50);
  const [online, setOnline] = useState(false);
  const [items, setItems] = useState<PublicUser[] | null>(null);
  const [noLocation, setNoLocation] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api<{ items: PublicUser[] }>(`/nearby?radius=${radius}&online=${online}`);
      setItems(r.items);
    } catch {
      setItems([]);
    }
  }, [radius, online]);

  useEffect(() => {
    void syncLocation(true).then((ok) => {
      setNoLocation(!ok);
      void load();
    });
  }, [load]);

  const head = (
    <View style={{ gap: 14, marginBottom: 6 }}>
      <Radar me={me} users={(items ?? []).slice(0, 8)} radiusKm={radius} hereLabel={t('nearby2.here')} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <Pressable onPress={() => setOnline((v) => !v)} style={[styles.pill, online && { backgroundColor: colors.online, borderColor: colors.online }]}>
          <View style={[styles.dot, online && { backgroundColor: colors.white }]} />
          <Text style={[styles.pillText, online && { color: colors.white }]}>{t('nearby2.onlineNow')}</Text>
        </Pressable>
        {RADII.map((r) => (
          <Pressable key={r} onPress={() => setRadius(r)} style={[styles.pill, radius === r && styles.pillOn]}>
            <Icon name="location" size={13} color={radius === r ? colors.bg : colors.ink} />
            <Text style={[styles.pillText, radius === r && { color: colors.bg }]}>{t('common.km', { n: r })}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {items?.length ? <Text style={styles.sub}>{t('nearby2.subtitle', { n: items.length, km: radius })}</Text> : null}
    </View>
  );

  return (
    <Screen>
      <Header title={t('nearby2.title')} />
      {noLocation && !items?.length ? (
        <EmptyState icon="location" pose="search" title={t('common.permissionDenied')} action={<Btn full={false} size="md" kind="dark" title={t('common.retry')} onPress={() => void syncLocation(true).then((ok) => { setNoLocation(!ok); void load(); })} />} />
      ) : !items ? <Loader full /> : (
        <FlatList
          data={items}
          numColumns={2}
          keyExtractor={(u) => u.id}
          ListHeaderComponent={head}
          columnWrapperStyle={{ gap: 10 }}
          contentContainerStyle={{ gap: 10, paddingBottom: 30, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl tintColor={colors.brand} refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
          ListEmptyComponent={<EmptyState icon="location" pose="search" title={t('nearby2.empty')} sub={t('nearby2.emptySub')} />}
          renderItem={({ item }) => <UserTile user={item} width={TW} />}
        />
      )}
    </Screen>
  );
}

/** Radar: 3 halqa (radiusun 1/3, 2/3, tam), istifadəçilər məsafəyə görə yerləşir; döyünən dalğa */
function Radar({ me, users, radiusKm, hereLabel }: { me: PublicUser | null; users: PublicUser[]; radiusKm: number; hereLabel: string }) {
  const wave = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const l = Animated.loop(Animated.timing(wave, { toValue: 1, duration: 2600, easing: Easing.out(Easing.quad), useNativeDriver: true }));
    l.start();
    return () => l.stop();
  }, [wave]);
  const C = RADAR / 2;
  const maxR = C - 30;
  return (
    <View style={[styles.radar, { height: RADAR * 0.78 }]}>
      <View style={{ width: RADAR, height: RADAR, position: 'absolute', top: -RADAR * 0.11, alignSelf: 'center' }}>
        {[1, 0.66, 0.33].map((k) => (
          <View key={k} style={[styles.ring, { width: maxR * 2 * k, height: maxR * 2 * k, borderRadius: maxR * k, left: C - maxR * k, top: C - maxR * k }]} />
        ))}
        <Animated.View style={[styles.wave, { left: C - maxR, top: C - maxR, width: maxR * 2, height: maxR * 2, borderRadius: maxR, opacity: wave.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] }), transform: [{ scale: wave.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) }] }]} />
        {users.map((u, i) => {
          // Halqa: sıraya görə (ən yaxın 3 — daxili, sonrakı 3 — orta, qalanı — xarici), məsafə böyükdürsə daha kənara
          const ring = i < 3 ? 0.42 : i < 6 ? 0.66 : 0.84;
          const d = Math.min(0.86, Math.max(ring, (u.distanceKm ?? radiusKm) / radiusKm));
          const inRing = i < 3 ? i : i < 6 ? i - 3 : i - 6;
          const a = (inRing / 3) * Math.PI * 2 - Math.PI / 2 + (i < 3 ? 0 : i < 6 ? Math.PI / 3 : Math.PI / 6);
          const x = C + Math.cos(a) * maxR * d, y = C + Math.sin(a) * maxR * d;
          return (
            <Pressable key={u.id} onPress={() => router.push({ pathname: '/user/[id]', params: { id: u.id } })} style={[styles.pin, { left: x - 24, top: y - 24 }]}>
              <Avatar uri={u.avatarUrl} name={u.name} size={48} online={u.online} />
              <View style={styles.km}><Text style={styles.kmText}>{u.distanceKm ?? '?'} km</Text></View>
            </Pressable>
          );
        })}
        <View style={[styles.center, { left: C - 30, top: C - 30 }]}>
          <Avatar uri={me?.avatarUrl} name={me?.name} size={60} ring={false} />
        </View>
      </View>
      <View style={styles.here}><Icon name="location" size={12} color={colors.white} /><Text style={styles.hereText}>{hereLabel}</Text></View>
    </View>
  );
}

const styles = StyleSheet.create({
  radar: { borderRadius: R.xl, backgroundColor: colors.night, overflow: 'hidden' },
  ring: { position: 'absolute', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.14)' },
  wave: { position: 'absolute', backgroundColor: colors.brand },
  pin: { position: 'absolute', width: 48, alignItems: 'center' },
  km: { marginTop: -8, height: 18, paddingHorizontal: 6, borderRadius: 9, backgroundColor: colors.white, justifyContent: 'center' },
  kmText: { ...noPad, fontFamily: fonts.black, fontSize: 10, lineHeight: 13, color: colors.ink },
  center: { position: 'absolute', width: 60, height: 60, borderRadius: 30, borderWidth: 3, borderColor: colors.brand },
  here: { position: 'absolute', left: 12, bottom: 12, flexDirection: 'row', alignItems: 'center', gap: 5, height: 26, paddingHorizontal: 10, borderRadius: 13, backgroundColor: colors.brand },
  hereText: { ...noPad, color: colors.white, fontFamily: fonts.bold, fontSize: 12, lineHeight: 15 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 14, borderRadius: 19, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.line },
  pillOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  pillText: { ...noPad, fontFamily: fonts.bold, fontSize: 13.5, lineHeight: 17, color: colors.ink },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.online },
  sub: { ...noPad, fontFamily: fonts.semibold, fontSize: 13, lineHeight: 17, color: colors.textMuted },
});
