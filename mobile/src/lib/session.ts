import i18n from '../i18n';
import { api, tokens } from './api';
import { useStore } from '../store';

export async function startSession(r: { accessToken: string; refreshToken: string }) {
  await tokens.set(r.accessToken, r.refreshToken);
  const me = await useStore.getState().refreshMe();
  if (me && me.locale !== i18n.language) {
    // Seçilmiş dil serverə yazılır ki, push bildirişlər eyni dildə gəlsin
    void api('/me', { method: 'PATCH', body: { locale: i18n.language } }).catch(() => {});
  }
  useStore.getState().setAuthed(true);
}

export async function changeLanguage(code: 'az' | 'ru' | 'en') {
  await i18n.changeLanguage(code);
  if (useStore.getState().authed) {
    useStore.getState().patchMe({ locale: code });
    void api('/me', { method: 'PATCH', body: { locale: code } }).catch(() => {});
  }
}
