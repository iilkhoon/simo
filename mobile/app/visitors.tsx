import { useTranslation } from 'react-i18next';
import { LockedGrid } from '@/components/LockedGrid';

export default function Visitors() {
  const { t } = useTranslation();
  return <LockedGrid endpoint="/me/visitors" title={t('visitors.title')} lockedText={(n) => t('visitors.locked', { n })} emptyTitle={t('visitors.empty')} emptySub={t('visitors.emptySub')} />;
}
