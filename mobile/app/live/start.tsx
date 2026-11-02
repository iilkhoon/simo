import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors } from '@/theme';
import { Btn, Header, Input, PressBox, Screen, T } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { api } from '@/lib/api';
import { errorText } from '@/lib/format';
import { pickImage } from '@/lib/media';
import { useStore } from '@/store';

export default function StartLive() {
  const { t } = useTranslation();
  const { me, toast } = useStore();
  const [type, setType] = useState<'VIDEO' | 'VOICE'>('VIDEO');
  const [title, setTitle] = useState('');
  const [cover, setCover] = useState<string | null>(me?.avatarUrl ?? null);
  const [loading, setLoading] = useState(false);

  async function start() {
    setLoading(true);
    try {
      const r = await api<{ room: { id: string } }>('/live', { body: { type, title: title.trim(), coverUrl: cover ?? undefined } });
      router.replace({ pathname: '/live/[id]', params: { id: r.room.id } });
    } catch (e) {
      toast(errorText(e), 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <Header title={t('live.goLive')} />
      <View style={{ gap: 16, flex: 1, paddingTop: 6 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
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
        </View>
        <PressBox style={{ alignSelf: 'center' }} r={22} sh={4} bg={colors.bgSunken} inner={styles.cover} onPress={async () => { try { const u = await pickImage(); if (u) setCover(u); } catch (e) { toast(errorText(e), 'error'); } }}>
          {cover ? <Image source={{ uri: cover }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Icon name="image" size={34} color={colors.textMuted} />}
          <View style={styles.coverEdit}><Icon name="camera" size={16} color={colors.ink} /></View>
        </PressBox>
        <Input value={title} onChangeText={setTitle} label={t('live.titleLabel')} placeholder={t('live.titlePlaceholder')} maxLength={60} />
        <View style={styles.tips}>
          <Icon name="shield" size={18} color={colors.ink} />
          <T v="small" color={colors.textMuted} style={{ flex: 1 }}>{t('live.rules')}</T>
        </View>
        <View style={{ flex: 1 }} />
        <Btn title={t('live.start')} icon="radio" kind={type === 'VIDEO' ? 'primary' : 'diamond'} loading={loading} onPress={start} style={{ marginBottom: 8 }} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  type: { alignItems: 'center', gap: 6, paddingVertical: 18, paddingHorizontal: 10 },
  typeIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  cover: { width: 140, height: 186, alignItems: 'center', justifyContent: 'center' },
  coverEdit: { position: 'absolute', right: 8, bottom: 8, backgroundColor: colors.card, borderRadius: 16, padding: 6 },
  tips: { flexDirection: 'row', gap: 10, alignItems: 'center', padding: 12, borderRadius: 14, backgroundColor: colors.bgSunken },
});
