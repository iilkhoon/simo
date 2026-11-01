import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, font, gradients, radius } from '@/theme';
import { GradientButton, Header, OutlineButton, Screen } from '@/components/ui';
import { api } from '@/lib/api';
import { errorText } from '@/lib/format';
import { pickImage } from '@/lib/media';
import { useStore } from '@/store';
import type { Me } from '@/lib/types';

export default function HostApply() {
  const { t } = useTranslation();
  const { me, setMe, toast } = useStore();
  const [selfie, setSelfie] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const perks = t('hostApply.perks', { returnObjects: true }) as string[];

  async function shoot() {
    try {
      const u = await pickImage({ camera: true, front: true });
      if (u) setSelfie(u);
    } catch (e) {
      toast(errorText(e), 'error');
    }
  }

  async function submit() {
    if (!selfie) return;
    setBusy(true);
    try {
      setMe(await api<Me>('/me/host/apply', { body: { verificationUrl: selfie } }));
      toast(t('hostApply.submitted'), 'success');
      router.back();
    } catch (e) {
      toast(errorText(e), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen scroll>
      <Header title={t('hostApply.title')} />
      <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <Text style={{ fontSize: 40 }}>💃</Text>
        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900', textAlign: 'center' }}>{t('hostApply.sub')}</Text>
      </LinearGradient>
      <View style={{ gap: 10, marginVertical: 16 }}>
        {perks.map((p) => <Text key={p} style={[font.body, { fontSize: 16 }]}>{p}</Text>)}
      </View>
      {me?.hostStatus === 'PENDING' ? (
        <Text style={[font.h3, { color: colors.gold, textAlign: 'center' }]}>⏳ {t('me.hostPending')}</Text>
      ) : (
        <>
          <View style={{ gap: 6, marginBottom: 16 }}>
            {[t('hostApply.step1'), t('hostApply.step2'), t('hostApply.step3')].map((s, i) => (
              <Text key={s} style={font.small}>{i + 1}. {s}</Text>
            ))}
          </View>
          {selfie ? <Image source={{ uri: selfie }} style={styles.selfie} contentFit="cover" /> : null}
          <OutlineButton title={t('hostApply.takeSelfie')} icon="camera" onPress={shoot} />
          <GradientButton title={t('hostApply.submit')} disabled={!selfie} loading={busy} onPress={submit} style={{ marginTop: 12 }} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: radius.xl, padding: 22, alignItems: 'center', gap: 10 },
  selfie: { width: 160, height: 210, borderRadius: radius.lg, alignSelf: 'center', marginBottom: 14 },
});
