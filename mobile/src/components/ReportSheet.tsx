/**
 * Hər yerdən şikayət (App Store 1.2): profil, canlı yayın, mesaj, post, şərh, hekayə.
 * İstifadə: openReport({ targetUserId, targetType, targetId }) — vərəq _layout-da bir dəfə qoşulur (<ReportHost />).
 * Şikayətdən sonra istifadəçini dərhal bloklamaq da təklif olunur.
 */
import React from 'react';
import { create } from 'zustand';
import { useTranslation } from 'react-i18next';
import { ActionSheet } from './ActionSheet';
import { api } from '../lib/api';
import { errorText } from '../lib/format';
import { useStore } from '../store';

export type ReportTarget = { targetUserId: string; targetType?: 'USER' | 'MESSAGE' | 'VIDEO' | 'LIVE' | 'COMMENT' | 'STORY'; targetId?: string };
const REASONS = ['SPAM', 'FAKE', 'NUDITY', 'HARASSMENT', 'UNDERAGE', 'SCAM', 'VIOLENCE', 'OTHER'] as const;

const useReport = create<{ target: ReportTarget | null; askBlock: string | null }>(() => ({ target: null, askBlock: null }));

export function openReport(target: ReportTarget) {
  useReport.setState({ target });
}

export function ReportHost() {
  const { t } = useTranslation();
  const toast = useStore((s) => s.toast);
  const { target, askBlock } = useReport();
  const send = (reason: string) => {
    if (!target) return;
    const tg = target;
    void api('/reports', { body: { targetType: 'USER', ...tg, reason } })
      .then(() => {
        toast(t('report.sent'), 'success');
        setTimeout(() => useReport.setState({ askBlock: tg.targetUserId }), 400);
      })
      .catch((e) => toast(errorText(e), 'error'));
  };
  return (
    <>
      <ActionSheet
        visible={!!target}
        title={t('profile.reportTitle')}
        onClose={() => useReport.setState({ target: null })}
        options={[...REASONS.map((r) => ({ label: t(`profile.reasons.${r}`), onPress: () => send(r) })), { label: t('common.cancel'), onPress: () => {} }]}
      />
      <ActionSheet
        visible={!!askBlock}
        title={t('report.blockToo')}
        onClose={() => useReport.setState({ askBlock: null })}
        options={[
          {
            label: t('common.block'), danger: true,
            onPress: () => { const id = askBlock; if (id) void api(`/users/${id}/block`, { body: {} }).then(() => toast(t('profile.blocked'), 'success')).catch((e) => toast(errorText(e), 'error')); },
          },
          { label: t('common.cancel'), onPress: () => {} },
        ]}
      />
    </>
  );
}
