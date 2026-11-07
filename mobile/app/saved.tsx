import React, { useCallback, useState } from 'react';
import { Dimensions } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Appear } from '@/components/motion';
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
      {items === null ? <Loader full variant="grid" n={6} width={(Dimensions.get('window').width - 32 - 24) / 3} /> : items.length ? <Appear from="fade"><PostGrid items={items} /></Appear> : <EmptyState art="bookmark" title={t('posts.noSaved')} sub={t('ui.savedSub')} />}
    </Screen>
  );
}
