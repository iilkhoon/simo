import { useTranslation } from 'react-i18next';
import { LockedGrid } from '@/components/LockedGrid';

export default function Likes() {
  const { t } = useTranslation();
  return <LockedGrid endpoint="/me/likes" title={t('likes.title')} lockedText={(n) => t('likes.locked', { n })} emptyTitle={t('likes.title')} />;
}
