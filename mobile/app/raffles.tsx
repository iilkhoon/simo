import React, { useCallback, useState } from 'react';
import { FlatList, Share, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, fonts, noPad, radius } from '@/theme';
import { Btn, EmptyState, Header, Loader, Screen, T } from '@/components/ui';
import { CoinIcon } from '@/components/GiftIcon';
import { Mascot } from '@/components/Mascot';
import { api } from '@/lib/api';
import { errorText, timeAgo } from '@/lib/format';
import { useStore } from '@/store';
import { WEB_URL } from '@/config';

interface R { id: string; title: string; description: string; prizeCoins: number; winners: number; endsAt: string; drawnAt: string | null; entries: number; entered: boolean; won: boolean }

/** Çəkilişlər — iştirak pulsuzdur (qanuna və mağaza qaydalarına uyğun) */
export default function Raffles() {
  const { t } = useTranslation();
  const { me, toast } = useStore();
  const [items, setItems] = useState<R[] | null>(null);
  const load = useCallback(() => { void api<{ items: R[] }>('/raffles').then((r) => setItems(r.items)).catch(() => setItems([])); }, []);
  useFocusEffect(load);
  async function enter(r: R, source: 'APP' | 'SHARE') {
    try {
      if (source === 'SHARE') await Share.share({ message: t('rewards.inviteShare', { code: String(me?.shortId ?? ''), url: WEB_URL }) });
      await api(`/raffles/${r.id}/enter`, { body: { source } });
      load();
    } catch (e) {
      toast(errorText(e), 'error');
    }
  }
  return (
    <Screen>
      <Header title={t('raffles.title')} />
      {items === null ? <Loader full /> : (
        <FlatList
          data={items}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ gap: 14, paddingBottom: 40, flexGrow: 1 }}
          ListHeaderComponent={<T v="small" color={colors.textMuted}>{t('raffles.rules')}</T>}
          ListEmptyComponent={<EmptyState icon="gift" pose="gift" title={t('raffles.empty')} />}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Mascot pose={item.won ? 'party' : 'gift'} size={84} float={false} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.title}>{item.title}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}><CoinIcon size={18} /><Text style={styles.prize}>{t('raffles.prize', { n: item.prizeCoins.toLocaleString('en-US') })}</Text></View>
                  <T v="tiny" color={colors.textMuted}>{t('raffles.entries', { n: item.entries })} · {item.drawnAt ? timeAgo(item.drawnAt) : t('raffles.ends', { t: new Date(item.endsAt).toLocaleString() })}</T>
                </View>
              </View>
              {item.description ? <T v="small" color={colors.textMuted}>{item.description}</T> : null}
              {item.won ? <T v="h3" color={colors.online}>{t('raffles.won')}</T> : item.drawnAt ? null : item.entered ? (
                <Btn kind="light" title={t('raffles.share')} icon="share" onPress={() => void enter(item, 'SHARE')} />
              ) : (
                <Btn title={t('raffles.enter')} icon="gift" onPress={() => void enter(item, 'APP')} />
              )}
            </View>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.xl, padding: 16, gap: 12 },
  title: { ...noPad, fontFamily: fonts.display, fontSize: 17, lineHeight: 22, color: colors.ink },
  prize: { ...noPad, fontFamily: fonts.black, fontSize: 15, lineHeight: 19, color: colors.ink },
});
