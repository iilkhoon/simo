import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, font, gradients, radius } from '@/theme';
import { GradientButton, Header, Screen } from '@/components/ui';
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
    <Screen>
      <Header title={t('live.goLive')} />
      <View style={{ gap: 16, flex: 1 }}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {(['VIDEO', 'VOICE'] as const).map((k) => (
            <Pressable key={k} style={{ flex: 1 }} onPress={() => setType(k)}>
              <LinearGradient colors={type === k ? gradients.primary : [colors.surface, colors.surface]} style={styles.type}>
                <Icon name={k === 'VIDEO' ? 'videocam' : 'mic'} size={30} />
                <Text style={font.h3}>{k === 'VIDEO' ? t('live.startVideo') : t('live.startVoice')}</Text>
              </LinearGradient>
            </Pressable>
          ))}
        </View>
        <Pressable onPress={async () => { try { const u = await pickImage(); if (u) setCover(u); } catch (e) { toast(errorText(e), 'error'); } }} style={styles.cover}>
          {cover ? <Image source={{ uri: cover }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Icon name="image" size={34} color={colors.textMuted} />}
          <View style={styles.coverEdit}><Icon name="camera" size={16} /></View>
        </Pressable>
        <TextInput value={title} onChangeText={setTitle} placeholder={t('live.titlePlaceholder')} placeholderTextColor={colors.textDim} style={styles.input} maxLength={60} />
        <View style={{ flex: 1 }} />
        <GradientButton title={t('live.start')} icon="live" loading={loading} onPress={start} style={{ marginBottom: 20 }} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  type: { alignItems: 'center', gap: 8, paddingVertical: 22, borderRadius: radius.lg },
  cover: { alignSelf: 'center', width: 150, height: 200, borderRadius: radius.lg, backgroundColor: colors.surface, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  coverEdit: { position: 'absolute', right: 8, bottom: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 14, padding: 6 },
  input: { backgroundColor: colors.surface, borderRadius: radius.md, color: '#fff', fontSize: 17, paddingHorizontal: 16, height: 56, borderWidth: 1, borderColor: colors.border },
});
