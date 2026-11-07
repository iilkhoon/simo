/**
 * Zəng / video yayın təhlükəsizlik qatı — ekranın üstünə qoşulur:
 *  - ilk görüntülü zəngdən əvvəl bir dəfəlik "zənglər yoxlanılır" bildirişi (qəbul edilmədən video göndərilmir);
 *  - kadr moderasiyası (useFrameModeration);
 *  - serverdən "safety:blur" gəldikdə qarşı tərəfin videosu örtülür və qəbul edilmir;
 *  - "safety:warning" gəldikdə öz videon müvəqqəti dayandırılır və xəbərdarlıq göstərilir;
 *  - görünən "Şikayət" düyməsi: səbəb siyahısı + qarşı tərəfin videosunun kadrı sübut kimi.
 *
 * İstifadə (zəng ekranı):
 *   <CallSafetyLayer contextType="CALL" contextId={call.id} isVideo={isVideo} active={videoLive && camOn}
 *     peerId={peer.id} peerUid={peerUid} onEnd={hangup} />
 */
import React, { useEffect, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { colors, fonts } from '../theme';
import { Icon } from './Icon';
import { ActionSheet } from './ActionSheet';
import { api } from '../lib/api';
import { errorText } from '../lib/format';
import { getSocket } from '../lib/socket';
import { useStore } from '../store';
import {
  LEGAL_URLS, acceptConsent, hideRemote, loadSafetyStatus, pauseLocalVideo, reportInCall, useFrameModeration, useSafety,
  type SafetyContext,
} from '../lib/callSafety';

const REASONS = ['NUDITY', 'UNDERAGE', 'HARASSMENT', 'SCAM', 'VIOLENCE', 'OTHER'] as const;

export interface CallSafetyProps {
  contextType: SafetyContext;
  contextId: string;
  /** Görüntülü zəng / video yayın */
  isVideo: boolean;
  /** Mən hazırda kamera ilə yayımlayıram (zəng qoşulub, kamera açıq / video yayının hostuyam) */
  active: boolean;
  /** Şikayət olunacaq qarşı tərəf (zəngdə həmsöhbət, yayında host) */
  peerId?: string | null;
  /** Qarşı tərəfin RTC uid-i (qısa ID) — kadr və videonun gizlədilməsi üçün */
  peerUid?: number | null;
  /** Zəngi bitir / yayından çıx */
  onEnd: () => void;
  /** Şikayət düyməsi (yayında öz bayraq düyməsi olduğu üçün söndürülə bilər) */
  showReport?: boolean;
  reportStyle?: StyleProp<ViewStyle>;
}

export function CallSafetyLayer({ contextType, contextId, isVideo, active, peerId, peerUid = null, onEnd, showReport = true, reportStyle }: CallSafetyProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const me = useStore((s) => s.me);
  const toast = useStore((s) => s.toast);
  const { status, blur, warning } = useSafety();
  const [now, setNow] = useState(Date.now());
  const [sheet, setSheet] = useState(false);
  const [after, setAfter] = useState(false);

  // Bildiriş: görüntülü zəngdə hər iki tərəf, yayında yalnız kamera ilə yayımlayan
  const needsNotice = isVideo && (contextType === 'CALL' || active);
  const noticePending = needsNotice && !!status && !status.videoNoticeAccepted;

  useEffect(() => {
    void loadSafetyStatus();
  }, []);

  // Bildiriş qəbul edilənə qədər öz videom göndərilmir
  useEffect(() => {
    if (!isVideo) return;
    if (noticePending) pauseLocalVideo(true);
    return () => { if (noticePending) pauseLocalVideo(false); };
  }, [noticePending, isVideo]);

  useFrameModeration(contextType, contextId, active && isVideo && !noticePending);

  useEffect(() => {
    const s = getSocket();
    if (!s) return;
    const onBlur = (p: { contextType: SafetyContext; contextId: string; offenderId: string; seconds: number; ended: boolean }) => {
      if (p.contextId !== contextId || p.offenderId === me?.id) return;
      useSafety.setState({ blur: { ...p, until: Date.now() + p.seconds * 1000 } });
    };
    const onWarn = (p: { contextType: SafetyContext; contextId: string; count: number; endAfter: number; seconds: number }) => {
      if (p.contextId !== contextId) return;
      useSafety.setState({ warning: { ...p, until: Date.now() + p.seconds * 1000 } });
    };
    const onStrike = (p: { strikes: number; strikesToSuspend: number }) => {
      toast(t('safety.strike', { n: p.strikes, max: p.strikesToSuspend }), 'error');
      void loadSafetyStatus(true);
    };
    s.on('safety:blur', onBlur);
    s.on('safety:warning', onWarn);
    s.on('safety:strike', onStrike);
    return () => {
      s.off('safety:blur', onBlur);
      s.off('safety:warning', onWarn);
      s.off('safety:strike', onStrike);
      useSafety.setState({ blur: null, warning: null });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextId, me?.id]);

  const blurOn = !!blur && blur.contextId === contextId && blur.until > now;
  const warnOn = !!warning && warning.contextId === contextId && warning.until > now;

  // Qarşı tərəfin videosunu qəbul etmə / öz videonu göndərmə — vaxt bitəndə bərpa
  useEffect(() => {
    if (!blurOn) return;
    hideRemote(peerUid, true);
    return () => hideRemote(peerUid, false);
  }, [blurOn, peerUid]);
  useEffect(() => {
    if (!warnOn) return;
    pauseLocalVideo(true);
    return () => pauseLocalVideo(false);
  }, [warnOn]);
  useEffect(() => {
    if (!blurOn && !warnOn) return;
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, [blurOn, warnOn]);

  async function send(reason: string) {
    if (!peerId) return;
    try {
      await reportInCall({ contextType, contextId, targetUserId: peerId, reason, remoteUid: isVideo ? peerUid : null });
      toast(t('safety.reportSent'), 'success');
      if (reason === 'NUDITY' || reason === 'UNDERAGE') {
        // Şikayətçini dərhal qoru: video gizlədilir, sonra zəngi bitirmək təklif olunur
        useSafety.setState({ blur: { contextType, contextId, offenderId: peerId, until: Date.now() + 15_000, ended: false } });
      }
      setTimeout(() => setAfter(true), 350);
    } catch (e) {
      toast(errorText(e), 'error');
    }
  }

  return (
    <>
      {blurOn ? (
        <View style={[StyleSheet.absoluteFill, styles.blur]}>
          <View style={styles.blurIcon}><Icon name="shield" size={34} color={colors.white} /></View>
          <Text style={styles.blurTitle}>{t('safety.hiddenTitle')}</Text>
          <Text style={styles.blurBody}>{t('safety.hiddenBody')}</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 22 }}>
            {showReport && peerId ? <Pressable style={[styles.btn, { backgroundColor: colors.glassLight }]} onPress={() => setSheet(true)}><Text style={styles.btnText}>{t('safety.report')}</Text></Pressable> : null}
            <Pressable style={[styles.btn, { backgroundColor: colors.brand }]} onPress={onEnd}><Text style={styles.btnText}>{t('safety.endCall')}</Text></Pressable>
          </View>
        </View>
      ) : null}

      {warnOn && warning ? (
        <View style={[styles.warn, { top: insets.top + 60 }]} pointerEvents="none">
          <Icon name="shield" size={20} color={colors.ink} />
          <View style={{ flex: 1 }}>
            <Text style={styles.warnTitle}>{t('safety.warnTitle')}</Text>
            <Text style={styles.warnBody}>{t('safety.warnBody')}{warning.count + 1 >= warning.endAfter ? ` ${t('safety.warnLast')}` : ''}</Text>
          </View>
        </View>
      ) : null}

      {showReport && peerId ? (
        <Pressable
          onPress={() => setSheet(true)}
          accessibilityRole="button"
          accessibilityLabel={t('safety.report')}
          hitSlop={8}
          style={({ pressed }) => [styles.report, { top: insets.top + 60 }, reportStyle, pressed && { opacity: 0.7 }]}
        >
          <Icon name="flag" size={16} color={colors.white} />
          <Text style={styles.reportText}>{t('safety.report')}</Text>
        </Pressable>
      ) : null}

      <ActionSheet
        visible={sheet}
        title={t('safety.reportTitle')}
        onClose={() => setSheet(false)}
        options={[...REASONS.map((r) => ({ label: t(`safety.reasons.${r}`), danger: r === 'NUDITY' || r === 'UNDERAGE', onPress: () => void send(r) })), { label: t('common.cancel'), onPress: () => {} }]}
      />
      <ActionSheet
        visible={after}
        title={t('safety.endAfterReport')}
        onClose={() => setAfter(false)}
        options={[
          { label: t('safety.endCall'), danger: true, onPress: onEnd },
          { label: t('safety.blockToo'), danger: true, onPress: () => { if (peerId) void api(`/users/${peerId}/block`, { body: {} }).then(onEnd).catch((e) => toast(errorText(e), 'error')); } },
          { label: t('safety.keepCall'), onPress: () => {} },
        ]}
      />

      <Modal visible={noticePending} transparent animationType="fade" onRequestClose={onEnd}>
        <View style={styles.noticeWrap}>
          <View style={[styles.notice, { marginBottom: insets.bottom + 12 }]}>
            <ScrollView contentContainerStyle={{ padding: 22, gap: 12 }}>
              <View style={styles.noticeIcon}><Icon name="shield" size={30} color={colors.ink} /></View>
              <Text style={styles.noticeTitle}>{t('safety.noticeTitle')}</Text>
              <Text style={styles.noticeBody}>{t('safety.noticeBody')}</Text>
              {(t('safety.noticePoints', { returnObjects: true }) as string[]).map((p) => (
                <View key={p} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                  <Text style={styles.dot}>•</Text>
                  <Text style={[styles.noticeBody, { flex: 1 }]}>{p}</Text>
                </View>
              ))}
              <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
                <Text style={styles.link} onPress={() => void Linking.openURL(LEGAL_URLS.guidelines)}>{t('safety.guidelines')}</Text>
                <Text style={styles.link} onPress={() => void Linking.openURL(LEGAL_URLS.privacy)}>{t('safety.privacy')}</Text>
              </View>
              <Pressable style={[styles.cta, { backgroundColor: colors.brand }]} onPress={() => void acceptConsent('VIDEO_MONITORING').then((ok) => { if (!ok) toast(t('common.error'), 'error'); })}>
                <Text style={styles.ctaText}>{t('safety.noticeAccept')}</Text>
              </Pressable>
              <Pressable style={[styles.cta, { backgroundColor: colors.bgSunken }]} onPress={onEnd}>
                <Text style={[styles.ctaText, { color: colors.ink }]}>{t('safety.noticeDecline')}</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  blur: { backgroundColor: 'rgba(12,10,9,0.97)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, zIndex: 40 },
  blurIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.glassLight, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  blurTitle: { color: colors.white, fontFamily: fonts.bold, fontSize: 20, textAlign: 'center' },
  blurBody: { color: colors.nightMuted, fontFamily: fonts.medium, fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  btn: { height: 44, paddingHorizontal: 18, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: colors.white, fontFamily: fonts.bold, fontSize: 14 },
  warn: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', gap: 10, padding: 12, borderRadius: 16, backgroundColor: colors.coin, zIndex: 41 },
  warnTitle: { color: colors.ink, fontFamily: fonts.bold, fontSize: 13 },
  warnBody: { color: colors.ink, fontFamily: fonts.medium, fontSize: 12, marginTop: 2, lineHeight: 16 },
  report: { position: 'absolute', left: 16, flexDirection: 'row', alignItems: 'center', gap: 6, height: 32, paddingHorizontal: 12, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 42 },
  reportText: { color: colors.white, fontFamily: fonts.bold, fontSize: 12 },
  noticeWrap: { flex: 1, backgroundColor: 'rgba(10,8,7,0.92)', justifyContent: 'flex-end', paddingHorizontal: 12 },
  notice: { backgroundColor: colors.bg, borderRadius: 26, maxHeight: '88%' },
  noticeIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.highlight, alignItems: 'center', justifyContent: 'center' },
  noticeTitle: { color: colors.ink, fontFamily: fonts.bold, fontSize: 20 },
  noticeBody: { color: colors.text, fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
  dot: { color: colors.brand, fontFamily: fonts.bold, fontSize: 16, lineHeight: 20 },
  link: { color: colors.brand, fontFamily: fonts.bold, fontSize: 13, textDecorationLine: 'underline' },
  cta: { height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: colors.white, fontFamily: fonts.bold, fontSize: 15 },
});
