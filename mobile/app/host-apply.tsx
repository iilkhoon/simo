import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, font, radius } from '@/theme';
import { Box, Btn, Card, Header, Screen, T, Tag } from '@/components/ui';
import { Icon } from '@/components/Icon';
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
      <Box r={26} sh={6} bg={colors.highlight} inner={styles.hero}>
        <View style={styles.heroIcon}><Icon name="sparkles" size={28} color={colors.ink} /></View>
        <T v="h2" center>{t('hostApply.sub')}</T>
      </Box>
      <Card r={22} sh={3} style={{ marginVertical: 14, padding: 16, gap: 12 }}>
        {perks.map((p) => <T key={p} v="bodyStrong">{p}</T>)}
      </Card>
      {me?.hostStatus === 'PENDING' ? (
        <Tag label={`⏳ ${t('me.hostPending')}`} bg={colors.coinSoft} style={{ alignSelf: 'center', height: 30, paddingHorizontal: 12 }} />
      ) : (
        <>
          <View style={{ gap: 6, marginBottom: 16 }}>
            {[t('hostApply.step1'), t('hostApply.step2'), t('hostApply.step3')].map((s, i) => (
              <Text key={s} style={font.small}>{i + 1}. {s}</Text>
            ))}
          </View>
          {selfie ? <Image source={{ uri: selfie }} style={styles.selfie} contentFit="cover" /> : null}
          <Btn kind="light" title={t('hostApply.takeSelfie')} icon="camera" onPress={shoot} />
          <Btn title={t('hostApply.submit')} disabled={!selfie} loading={busy} onPress={submit} style={{ marginTop: 12 }} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { padding: 22, alignItems: 'center', gap: 12 },
  heroIcon: { width: 58, height: 58, borderRadius: 29, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  selfie: { width: 160, height: 210, borderRadius: radius.lg, alignSelf: 'center', marginBottom: 14, borderWidth: 2.5, borderColor: colors.ink },
});
