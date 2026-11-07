import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors } from '@/theme';
import { Btn, Header, Input, PressBox, Screen, T, Tabs } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { Appear } from '@/components/motion';
import { api } from '@/lib/api';
import { errorText } from '@/lib/format';
import { pickImage } from '@/lib/media';
import { useStore } from '@/store';

export default function StartLive() {
  const { t } = useTranslation();
  const { me, toast } = useStore();
  const params = useLocalSearchParams<{ type?: 'VIDEO' | 'VOICE' }>();
  const [type, setType] = useState<'VIDEO' | 'VOICE'>(params.type === 'VOICE' ? 'VOICE' : 'VIDEO');
  const [seats, setSeats] = useState<'4' | '8' | '12'>('8');
  const [title, setTitle] = useState('');
  const [cover, setCover] = useState<string | null>(me?.avatarUrl ?? null);
  const [loading, setLoading] = useState(false);

  async function start() {
    setLoading(true);
    try {
      const r = await api<{ room: { id: string } }>('/live', { body: { type, title: title.trim(), coverUrl: cover ?? undefined, seatCount: Number(seats) } });
      router.replace({ pathname: '/live/[id]', params: { id: r.room.id } });
    } catch (e) {
      toast(errorText(e), 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen edges={['top', 'bottom']} scroll bottom={24}>
      <Header title={t('live.goLive')} />
      <View style={{ gap: 16, paddingTop: 6 }}>
        <Appear i={0} style={{ flexDirection: 'row', gap: 8 }}>
          {(['VIDEO', 'VOICE'] as const).map((k) => {
            const on = type === k;
            return (
              <PressBox key={k} style={{ flex: 1 }} r={22} sh={on ? 0 : 1} bg={on ? (k === 'VIDEO' ? colors.brand : colors.diamond) : colors.card} inner={styles.type} onPress={() => setType(k)}>
                <View style={[styles.typeIcon, !on && { backgroundColor: colors.bgSunken }]}><Icon name={k === 'VIDEO' ? 'videocam' : 'mic'} size={24} color={colors.ink} /></View>
                <T v="h3" color={on ? colors.white : colors.ink}>{k === 'VIDEO' ? t('live.startVideo') : t('live.startVoice')}</T>
                <T v="tiny" color={on ? 'rgba(255,255,255,0.85)' : colors.textMuted} center>{k === 'VIDEO' ? t('live.videoHint') : t('live.voiceHint')}</T>
              </PressBox>
            );
          })}
        </Appear>
        <Appear i={1}>
        <PressBox style={styles.coverWrap} r={22} sh={4} bg={colors.bgSunken} inner={styles.cover} onPress={async () => { try { const u = await pickImage(); if (u) setCover(u); } catch (e) { toast(errorText(e), 'error'); } }}>
          {cover ? <Image source={{ uri: cover }} style={styles.coverImg} contentFit="cover" /> : <Icon name="image" size={34} color={colors.textMuted} />}
          <View style={styles.coverEdit}><Icon name="camera" size={16} color={colors.ink} /></View>
        </PressBox>
        </Appear>
        {type === 'VOICE' ? (
          <View style={{ gap: 6 }}>
            <T v="label" color={colors.textMuted}>{t('live.seatCount')}</T>
            <Tabs<'4' | '8' | '12'> value={seats} onChange={setSeats} options={[{ key: '4', label: '4' }, { key: '8', label: '8' }, { key: '12', label: '12' }]} />
          </View>
        ) : null}
        <Appear i={2} style={{ gap: 6 }}>
          <Input value={title} onChangeText={setTitle} label={t('live.titleLabel')} placeholder={t('live.titlePlaceholder')} maxLength={60} />
          <T v="tiny" color={colors.textDim} style={{ alignSelf: 'flex-end' }}>{title.length}/60</T>
        </Appear>
        <View style={styles.tips}>
          <Icon name="shield" size={18} color={colors.online} />
          <T v="small" color={colors.textMuted} style={{ flex: 1 }}>{t('live.rules')}</T>
        </View>
        <Btn title={t('live.start')} icon="radio" kind={type === 'VIDEO' ? 'primary' : 'diamond'} loading={loading} onPress={start} style={{ marginBottom: 8 }} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  type: { alignItems: 'center', gap: 6, paddingVertical: 18, paddingHorizontal: 10 },
  typeIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  coverWrap: { alignSelf: 'center', width: 132, height: 176 },
  cover: { width: 132, height: 176, alignItems: 'center', justifyContent: 'center' },
  coverImg: { position: 'absolute', top: 0, left: 0, width: 132, height: 176 },
  coverEdit: { position: 'absolute', right: 8, bottom: 8, backgroundColor: colors.card, borderRadius: 16, padding: 6 },
  tips: { flexDirection: 'row', gap: 10, alignItems: 'center', padding: 12, borderRadius: 16, backgroundColor: colors.onlineSoft },
});
