/** Veb önizləmə: Agora yoxdur — kadr götürülmür (zənglər yalnız iOS/Android-də işləyir) */
export const snapshotSupported = () => false;
export function engine(): { muteRemoteVideoStream: (uid: number, mute: boolean) => number; muteLocalVideoStream: (mute: boolean) => number } | null {
  return null;
}
export function takeSnapshot(_uid: number, _name: 'local' | 'remote'): Promise<string | null> {
  return Promise.resolve(null);
}
