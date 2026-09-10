import type { TextPreset, CarColor, TextLanguage, TextLength } from '../types/game';

export const CAR_COLORS: CarColor[] = [
  {
    id: 'cyan',
    name: 'Cyber Cyan',
    primary: '#00F2FE',
    secondary: '#4FACFE',
    glow: 'rgba(0, 242, 254, 0.6)'
  },
  {
    id: 'red',
    name: 'Neon Crimson',
    primary: '#FF0055',
    secondary: '#FF5050',
    glow: 'rgba(255, 0, 85, 0.6)'
  },
  {
    id: 'green',
    name: 'Emerald Nitro',
    primary: '#39FF14',
    secondary: '#00FF88',
    glow: 'rgba(57, 255, 20, 0.6)'
  },
  {
    id: 'yellow',
    name: 'Volt Amber',
    primary: '#FFD700',
    secondary: '#FF8C00',
    glow: 'rgba(255, 215, 0, 0.6)'
  },
  {
    id: 'purple',
    name: 'Phantom Purple',
    primary: '#B000FF',
    secondary: '#7B2CBF',
    glow: 'rgba(176, 0, 255, 0.6)'
  },
  {
    id: 'orange',
    name: 'Sunset Flame',
    primary: '#FF4500',
    secondary: '#FF7300',
    glow: 'rgba(255, 69, 0, 0.6)'
  }
];

// Rich Word Bank for Auto Generating Typing Passages
const WORD_BANK_ID = [
  'balap', 'cepat', 'mengetik', 'mobil', 'sirkuit', 'lintasan', 'fokus', 'juara',
  'akurasi', 'waktu', 'detik', 'mesin', 'kecepatan', 'jari', 'papan', 'ketik',
  'konsentrasi', 'pacu', 'garis', 'finis', 'nitro', 'teknologi', 'roda', 'jalan',
  'digital', 'ritme', 'gaya', 'daya', 'arena', 'piala', 'podium', 'laga',
  'aksi', 'hebat', 'bisa', 'kita', 'saya', 'kamu', 'dengan', 'untuk', 'pada',
  'yang', 'dari', 'oleh', 'akan', 'telah', 'harus', 'dapat', 'lebih', 'tinggi',
  'jauh', 'luas', 'terang', 'maju', 'lari', 'tenang', 'mantap', 'tangguh', 'kencang',
  'puncak', 'sorot', 'seru', 'tanding', 'lawan', 'ruang', 'gabung', 'main',
  'rekor', 'posisi', 'kejar', 'susul', 'tikungan', 'lurus', 'laju', 'tancap',
  'gas', 'derap', 'tombol', 'performa', 'unggul', 'prestasi', 'semangat', 'tuntas',
  'uji', 'kemampuan', 'latih', 'refleks', 'otot', 'memori', 'harmoni', 'suara'
];

const WORD_BANK_EN = [
  'speed', 'racer', 'typing', 'fast', 'track', 'focus', 'finish', 'win',
  'turbo', 'nitro', 'engine', 'drive', 'drift', 'champion', 'accuracy', 'rhythm',
  'power', 'rapid', 'shift', 'gear', 'asphalt', 'victory', 'street', 'dynamic',
  'apex', 'fuel', 'boost', 'flash', 'circuit', 'glory', 'pulse', 'score',
  'time', 'quick', 'jump', 'over', 'press', 'key', 'board', 'light',
  'bold', 'smooth', 'sharp', 'flow', 'race', 'lane', 'lap', 'rival',
  'crown', 'hyper', 'sonic', 'dash', 'blade', 'storm', 'surge', 'rush',
  'spark', 'blaze', 'steer', 'wheel', 'strike', 'force', 'pace', 'lead',
  'zone', 'rally', 'line', 'mode', 'grid', 'rank', 'match', 'clash'
];

export const TYPING_TEXTS: TextPreset[] = [
  {
    id: 'id-preset-1',
    lang: 'ID',
    length: 25,
    title: 'Sirkuit Kecepatan',
    text: 'Mengetik cepat membutuhkan fokus penuh dan akurasi tinggi di atas papan ketik balap digital.'
  },
  {
    id: 'en-preset-1',
    lang: 'EN',
    length: 25,
    title: 'Speed Circuit',
    text: 'Precision beats speed when racing on the digital track towards ultimate victory and glory.'
  }
];

export function autoGenerateText(lang: TextLanguage = 'ID', length: TextLength = 25): string {
  const wordCount = length || 25;
  const wordBank = lang === 'ID' ? WORD_BANK_ID : WORD_BANK_EN;

  const selectedWords: string[] = [];
  let previousWord = '';

  for (let i = 0; i < wordCount; i++) {
    let randomWord = wordBank[Math.floor(Math.random() * wordBank.length)];
    // Avoid immediate duplicate word
    while (randomWord === previousWord) {
      randomWord = wordBank[Math.floor(Math.random() * wordBank.length)];
    }
    previousWord = randomWord;

    // Capitalize first word of sentence
    if (i === 0 || i % 10 === 0) {
      randomWord = randomWord.charAt(0).toUpperCase() + randomWord.slice(1);
    }

    // Add punctuation occasionally
    if ((i + 1) % 10 === 0 && i !== wordCount - 1) {
      randomWord += '.';
    }

    selectedWords.push(randomWord);
  }

  // Join words with single space
  let generated = selectedWords.join(' ');
  if (!generated.endsWith('.')) {
    generated += '.';
  }

  return generated;
}

export function getRandomText(lang: TextLanguage = 'ID', length: TextLength = 25): string {
  // 85% chance of auto generated fresh unique word sequence, 15% static preset
  if (Math.random() < 0.85) {
    return autoGenerateText(lang, length);
  }

  const filtered = TYPING_TEXTS.filter(t => t.lang === lang);
  if (filtered.length > 0) {
    return filtered[Math.floor(Math.random() * filtered.length)].text;
  }
  return autoGenerateText(lang, length);
}
