/**
 * Avtomatik məzmun filtri (App Store 1.2: obyektiv filtr tələbi).
 * Söyüş, təhqir və nifrət ifadələri *** ilə gizlədilir — mesaj, şərh, post, bio, ad, canlı yayın adı və şərhləri.
 * Siyahını genişləndirmək: BAD_STEMS (kökdən başlayan bütün formalar) və BAD_EXACT (yalnız tam söz).
 * Admin panelindəki şikayət sistemi və bloklama bununla birlikdə işləyir.
 */

/** Kök: bu hərflərlə BAŞLAYAN istənilən söz gizlədilir */
const BAD_STEMS = [
  // AZ / TR
  'sikdir', 'sikim', 'sikib', 'sikər', 'siker', 'sikəc', 'sikec', 'sikiş', 'sikis', 'sikil', 'amcıq', 'amciq', 'amına', 'amina',
  'götvere', 'gotvere', 'götün', 'qəhbə', 'qehbe', 'qahba', 'gəhbə', 'gehbe', 'fahişə', 'fahise', 'orospu', 'oğraş', 'ograş', 'ogras',
  'peysər', 'peyser', 'dalbayob', 'dalbayop', 'qandon', 'gijdıllax', 'gijdillax', 'pezevenk', 'pezəvəng', 'yarrak', 'yarak',
  // RU
  'хуй', 'хуе', 'хуё', 'хуя', 'пизд', 'ебат', 'ебан', 'ебал', 'ебу', 'еблан', 'выеб', 'заеб', 'уеб', 'блять', 'бляд', 'сучк', 'сука',
  'мудак', 'мудил', 'пидор', 'пидар', 'шлюх', 'залуп', 'гандон', 'дроч', 'манда',
  // EN
  'fuck', 'motherfuck', 'shit', 'bitch', 'cunt', 'whore', 'slut', 'nigger', 'nigga', 'faggot', 'asshole', 'bastard', 'dickhead', 'pussy',
];

/** Yalnız tam söz kimi (başqa sözlərin içində ola biləcək qısa sözlər) */
const BAD_EXACT = ['sik', 'sikə', 'göt', 'бля', 'хер', 'dick', 'fag', 'cock', 'fck', 'fuk', 'fuq', 'stfu', 'wtf'];

// Gizlədilən simvollar: s1k, $ik, f*ck kimi yazılışlar
const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '@': 'a', $: 's', '!': 'i' };

function norm(word: string) {
  return word.toLocaleLowerCase('az').replace(/[0134@$!]/g, (c) => LEET[c] ?? c).replace(/[*_.-]/g, '');
}

const WORD = /[\p{L}\p{N}@$!*_.-]+/gu;

function isBad(word: string) {
  const w = norm(word);
  if (w.length < 2) return false;
  if (BAD_EXACT.includes(w)) return true;
  return BAD_STEMS.some((s) => w.startsWith(s));
}

/** Pis sözləri *** ilə əvəz edir */
export function filterProfanity(text: string): string {
  if (!text) return text;
  return text.replace(WORD, (m) => (isBad(m) ? '*'.repeat(Math.min(6, Math.max(3, m.length))) : m));
}

/** Mətndə pis söz varmı (ad kimi tamamilə rədd edilməli sahələr üçün) */
export function hasProfanity(text: string): boolean {
  return (text.match(WORD) ?? []).some(isBad);
}

/* ───────── Vizual moderasiya: kadr qiymətləndirməsi (zəng və canlı yayın) ───────── */

/** Provayderdən asılı olmayan normallaşdırılmış ballar (0..1) */
export interface FrameScores {
  /** Açıq çılpaqlıq / cinsi fəaliyyət / cinsiyyət orqanlarının nümayişi */
  sexual: number;
  /** Erotik, çox təhrikedici poza, alt paltarı və s. */
  suggestive: number;
  /** Provayder azyaşlı ehtimalı verirsə (məs. üz yaşı modeli) */
  minor?: number;
}

export type FrameVerdict = 'SAFE' | 'SUSPECT' | 'VIOLATION' | 'UNSCANNED';

export interface VerdictThresholds {
  /** Bu baldan yuxarı — dərhal tədbir (bulanıqlaşdırma, xəbərdarlıq, strike) */
  block: number;
  /** Bu baldan yuxarı — moderator növbəsinə (avtomatik tədbirsiz) */
  review: number;
}

/**
 * Kadr üçün qərar. "Suggestive" tək başına bloklamır (yanlış pozitiv çox olur — çimərlik, idman),
 * yalnız çox yüksək olduqda moderatora göndərilir. Azyaşlı ehtimalı + hər hansı cinsi siqnal = pozuntu.
 */
export function frameVerdict(s: FrameScores | null, t: VerdictThresholds): FrameVerdict {
  if (!s) return 'UNSCANNED';
  if (s.sexual >= t.block) return 'VIOLATION';
  if ((s.minor ?? 0) >= 0.8 && Math.max(s.sexual, s.suggestive) >= t.review) return 'VIOLATION';
  if (s.sexual >= t.review || s.suggestive >= Math.max(t.block, 0.9)) return 'SUSPECT';
  return 'SAFE';
}

export type StrikeAction = 'WARN' | 'SUSPEND' | 'BAN';

/**
 * Xəbərdarlıq pilləsi (aktiv strike sayına görə):
 * 1..N-1 → xəbərdarlıq; N..2N-1 → müvəqqəti dayandırma; 2N və daha çox → daimi blok.
 */
export function strikeAction(activeStrikes: number, strikesToSuspend: number): StrikeAction {
  const n = Math.max(1, strikesToSuspend);
  if (activeStrikes >= n * 2) return 'BAN';
  if (activeStrikes >= n) return 'SUSPEND';
  return 'WARN';
}
