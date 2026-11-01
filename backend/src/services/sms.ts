import { config } from '../config.js';

/**
 * SMS göndərmə. Azərbaycan provayderləri (məs. LSIM, Azercell Business SMS, Twilio) HTTP API ilə qoşulur.
 * SMS_API_URL-ə {to, text, sender} JSON POST edilir; provayderin formatına uyğun dəyişin.
 */
export async function sendSms(to: string, text: string): Promise<void> {
  if (!config.sms.url) {
    console.log(`[SMS:dev] ${to}: ${text}`);
    return;
  }
  const res = await fetch(config.sms.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.sms.token}` },
    body: JSON.stringify({ to, text, sender: config.sms.sender }),
  });
  if (!res.ok) throw new Error(`SMS failed: ${res.status}`);
}
