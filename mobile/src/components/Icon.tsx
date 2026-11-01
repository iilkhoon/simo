import React from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';

const MAP = {
  back: 'chevron-back', chevron: 'chevron-forward', close: 'close', heart: 'heart', heartOutline: 'heart-outline',
  star: 'star', flame: 'flame', compass: 'compass', live: 'radio', video: 'play-circle', chat: 'chatbubbles',
  chatOutline: 'chatbubble-ellipses-outline', person: 'person', personOutline: 'person-outline', gift: 'gift',
  call: 'call', videocam: 'videocam', videocamOff: 'videocam-off', mic: 'mic', micOff: 'mic-off', send: 'send',
  image: 'image', camera: 'camera', flip: 'camera-reverse', location: 'location', settings: 'settings-outline',
  wallet: 'wallet', diamond: 'diamond', crown: 'ribbon', trophy: 'trophy', eye: 'eye', bell: 'notifications',
  people: 'people', business: 'business', add: 'add', addCircle: 'add-circle', checkmark: 'checkmark',
  verified: 'checkmark-circle', shield: 'shield-checkmark', flag: 'flag', ban: 'ban', share: 'share-social',
  copy: 'copy-outline', logout: 'log-out-outline', trash: 'trash-outline', language: 'language', filter: 'options',
  sparkles: 'sparkles', calendar: 'calendar', more: 'ellipsis-horizontal', speaker: 'volume-high', speakerOff: 'volume-mute',
  coin: 'logo-bitcoin', refresh: 'refresh', time: 'time-outline', musical: 'musical-notes', lock: 'lock-closed',
  help: 'help-circle-outline', document: 'document-text-outline', phone: 'phone-portrait-outline', mail: 'mail-outline',
  beauty: 'color-wand', rocket: 'rocket', play: 'play', pause: 'pause', exit: 'exit-outline', cash: 'cash-outline',
  undo: 'arrow-undo', thunder: 'flash',
} as const;

export type IconName = keyof typeof MAP;

export function Icon({ name, size = 22, color = '#fff' }: { name: IconName; size?: number; color?: string }) {
  return <Ionicons name={MAP[name]} size={size} color={color} />;
}
