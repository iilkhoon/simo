import React from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import Svg, { Circle, Path } from 'react-native-svg';

const MAP = {
  back: 'chevron-back', chevron: 'chevron-forward', close: 'close', heart: 'heart', heartOutline: 'heart-outline',
  star: 'star', flame: 'flame', compass: 'compass', live: 'radio', video: 'play-circle', chat: 'chatbubbles',
  chatOutline: 'chatbubble-ellipses-outline', person: 'person', personOutline: 'person-outline', gift: 'gift',
  call: 'call', videocam: 'videocam', videocamOff: 'videocam-off', mic: 'mic', micOff: 'mic-off', send: 'send',
  image: 'image', camera: 'camera', flip: 'camera-reverse', location: 'location', settings: 'settings-outline',
  wallet: 'wallet', diamond: 'diamond', crown: 'ribbon', trophy: 'trophy', eye: 'eye', bell: 'notifications',
  people: 'people', business: 'business', add: 'add', remove: 'remove', receipt: 'receipt-outline', cart: 'bag-handle', addCircle: 'add-circle', checkmark: 'checkmark',
  verified: 'checkmark-circle', shield: 'shield-checkmark', flag: 'flag', ban: 'ban', share: 'share-social',
  copy: 'copy-outline', logout: 'log-out-outline', trash: 'trash-outline', language: 'language', filter: 'options',
  sparkles: 'sparkles', calendar: 'calendar', more: 'ellipsis-horizontal', speaker: 'volume-high', speakerOff: 'volume-mute',
  coin: 'logo-bitcoin', refresh: 'refresh', time: 'time-outline', musical: 'musical-notes', lock: 'lock-closed',
  help: 'help-circle-outline', document: 'document-text-outline', phone: 'phone-portrait-outline', mail: 'mail-outline',
  beauty: 'color-wand', rocket: 'rocket', play: 'play', pause: 'pause', exit: 'exit-outline', cash: 'cash-outline',
  undo: 'arrow-undo', thunder: 'flash', shuffle: 'shuffle', search: 'search', grid: 'grid-outline', emoji: 'happy-outline',
  arrowUp: 'arrow-up', arrowRight: 'arrow-forward', radio: 'radio-outline', compassOutline: 'compass-outline',
  chatsOutline: 'chatbubbles-outline', playOutline: 'play-circle-outline', liveOutline: 'radio-outline', headset: 'headset',
  micOutline: 'mic-outline', videocamOutline: 'videocam-outline', callOutline: 'call-outline', end: 'call', hand: 'hand-left',
  sofa: 'cafe', globe: 'earth', male: 'male', female: 'female', heartDislike: 'close', sparklesOutline: 'sparkles-outline',
  attach: 'add', pin: 'location-outline', dots: 'ellipsis-vertical', check2: 'checkmark-done', tv: 'tv-outline', dot: 'ellipse', home: 'home', homeOutline: 'home-outline', nazar: 'eye-outline', bolt: 'flash-outline', users: 'people-outline', bookmark: 'bookmark', bookmarkOutline: 'bookmark-outline', lockOpen: 'lock-open', send2: 'paper-plane-outline', swords: 'flash', stats: 'stats-chart', mute: 'volume-mute', userAdd: 'person-add',
  ruler: 'resize-outline', school: 'school-outline', briefcase: 'briefcase-outline', wine: 'wine-outline', smoke: 'cloud-outline', kids: 'happy-outline',
  flameOutline: 'flame-outline', ticket: 'ticket', medal: 'medal', podium: 'podium', infinite: 'infinite', eyeOff: 'eye-off-outline',
} as const;

/**
 * Ionicons-da olmayan (və ya uyğunsuz) qliflər — eyni üslubda (dolu, yumru künclü, 24 şəbəkə) əl ilə çəkilib.
 * `crown` əvvəl "ribbon" (medal) idi, `coin` isə "logo-bitcoin" — ikisi də brendə uyğun deyildi.
 */
const CUSTOM: Partial<Record<string, (c: string) => React.ReactNode>> = {
  crown: (c) => (
    <>
      <Path d="M3.2 8.4l4.6 3.9L12 5.6l4.2 6.7 4.6-3.9-1.5 9a1.6 1.6 0 0 1-1.6 1.3H6.3a1.6 1.6 0 0 1-1.6-1.3l-1.5-9z" fill={c} />
      <Circle cx={3.2} cy={7.6} r={1.6} fill={c} />
      <Circle cx={12} cy={4.4} r={1.7} fill={c} />
      <Circle cx={20.8} cy={7.6} r={1.6} fill={c} />
      <Path d="M6.4 20.8h11.2" stroke={c} strokeWidth={1.8} strokeLinecap="round" />
    </>
  ),
  coin: (c) => (
    <>
      <Circle cx={12} cy={12} r={9.5} fill="none" stroke={c} strokeWidth={2} />
      <Path d="M12 16.6s-4.2-2.5-4.2-5.3c0-1.4 1-2.4 2.3-2.4.9 0 1.5.4 1.9 1.1.4-.7 1-1.1 1.9-1.1 1.3 0 2.3 1 2.3 2.4 0 2.8-4.2 5.3-4.2 5.3z" fill={c} />
    </>
  ),
};

export type IconName = keyof typeof MAP;

export function Icon({ name, size = 22, color = '#1A1512' }: { name: IconName; size?: number; color?: string }) {
  const custom = CUSTOM[name];
  if (custom) return <Svg width={size} height={size} viewBox="0 0 24 24">{custom(color)}</Svg>;
  return <Ionicons name={MAP[name]} size={size} color={color} />;
}
