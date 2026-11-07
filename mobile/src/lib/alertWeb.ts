/**
 * react-native-web-də Alert.alert heç nə etmir (no-op) — vebdə "Hesabı sil", "Yayını bitir", "Çıxış" kimi
 * təsdiq dialoqları açılmırdı və əməliyyat mümkün olmurdu. Vebdə brauzerin confirm/alert pəncərəsi ilə əvəz edirik:
 *  - düymə yoxdursa / bircə düymə varsa — window.alert, sonra həmin düymənin onPress-i;
 *  - bir neçə düymə varsa — window.confirm: "OK" → ləğv olmayan sonuncu düymə, "Cancel" → ləğv düyməsi.
 * Yalnız _layout-da bir dəfə import olunur; native platformalara təsir etmir.
 */
import { Alert, Platform, type AlertButton } from 'react-native';

if (Platform.OS === 'web' && typeof window !== 'undefined') {
  Alert.alert = (title: string, message?: string, buttons?: AlertButton[]) => {
    const text = [title, message].filter(Boolean).join('\n\n');
    const list = buttons ?? [];
    if (list.length <= 1) {
      window.alert(text);
      list[0]?.onPress?.();
      return;
    }
    const cancel = list.find((b) => b.style === 'cancel');
    const action = [...list].reverse().find((b) => b.style !== 'cancel');
    if (window.confirm(text)) action?.onPress?.();
    else cancel?.onPress?.();
  };
}
