import { config } from '../config.js';
import { maskPhone } from '../lib/security.js';

/**
 * SMS göndərmə. Azərbaycan provayderləri (məs. LSIM, Azercell Business SMS, Twilio) HTTP API ilə qoşulur.
 * SMS_API_URL-ə {to, text, sender} JSON POST edilir; provayderin formatına uyğun dəyişin.
 */
export async function sendSms(to: string, text: string): Promise<void> {
  if (!config.sms.url) {
    // Yalnız inkişaf/staging: mətn (kod) konsola yazılır. İstehsalda SMS_API_URL olmadan server başlamır.
    if (config.isProd) console.log(`[SMS:dev] ${maskPhone(to)}: (SMS provayderi qoşulmayıb)`);
    else console.log(`[SMS:dev] ${to}: ${text}`);
    return;
  }
  const res = await fetch(config.sms.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.sms.token}` },
    body: JSON.stringify({ to, text, sender: config.sms.sender }),
    signal: AbortSignal.timeout(10_000),
  });
  // Xəta mətnində nömrə və ya kod yoxdur
  if (!res.ok) throw new Error(`SMS failed: ${res.status}`);
}
