import { useEffect } from 'react';
import { router } from 'expo-router';
import { Loader, Screen } from '@/components/ui';

export default function PaymentResult() {
  useEffect(() => {
    const t = setTimeout(() => router.replace('/wallet'), 300);
    return () => clearTimeout(t);
  }, []);
  return (
    <Screen>
      <Loader full />
    </Screen>
  );
}
