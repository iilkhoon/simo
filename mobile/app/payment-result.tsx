import React, { useEffect } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Btn, EmptyState, Screen } from '@/components/ui';
import { PopIn } from '@/components/motion';
import { useStore } from '@/store';

/**
 * Epoint ödənişindən sonra deep-link (simo://payment-result?status=…) ilə açılır.
 * Nəticəni qısa göstərir, balansı yeniləyir və pul kisəsinə qaytarır.
 */
export default function PaymentResult() {
  const { t } = useTranslation();
  const { status } = useLocalSearchParams<{ status?: string; order?: string }>();
  const refreshMe = useStore((s) => s.refreshMe);
  const ok = !status || /^(success|ok|paid)$/i.test(status);
  useEffect(() => {
    void refreshMe().catch(() => {});
    const id = setTimeout(() => router.replace('/wallet'), ok ? 1800 : 4000);
    return () => clearTimeout(id);
  }, [ok, refreshMe]);
  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <PopIn>
          <EmptyState
            art={ok ? 'gift' : 'shield'}
            title={ok ? t('u2.payOk') : t('u2.payFail')}
            sub={ok ? t('u2.payOkSub') : t('u2.payFailSub')}
            action={<Btn full={false} kind={ok ? 'primary' : 'dark'} icon="wallet" title={t('u2.toWallet')} onPress={() => router.replace('/wallet')} />}
          />
        </PopIn>
      </View>
    </Screen>
  );
}
