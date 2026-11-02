import React, { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { EmptyState, Header, Loader, Screen } from '@/components/ui';
import { PostGrid, type Post } from '@/components/PostGrid';
import { api } from '@/lib/api';

/** Yadda saxlanılan postlar */
export default function Saved() {
  const { t } = useTranslation();
  const [items, setItems] = useState<Post[] | null>(null);
  useFocusEffect(useCallback(() => { void api<{ items: Post[] }>('/videos/saved').then((r) => setItems(r.items)).catch(() => setItems([])); }, []));
  return (
    <Screen>
      <Header title={t('me.saved')} />
      {items === null ? <Loader full /> : items.length ? <PostGrid items={items} /> : <EmptyState icon="video" pose="coffee" title={t('posts.noSaved')} />}
    </Screen>
  );
}
