import type { CarColor, TextLanguage, TextMode, TextLength } from '../types/game';

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

export interface MonkeyQuote {
  id?: number;
  text: string;
  source?: string;
  length?: number;
}

// In-memory cache for API fetched datasets
let monkeytypeIdQuotesCache: string[] | null = null;
let monkeytypeEnQuotesCache: string[] | null = null;
let monkeytypeIdWordsCache: string[] | null = null;
let monkeytypeEnWordsCache: string[] | null = null;

// Categorized Word Buckets for Indonesian Natural Grammar Construction
const ID_NOUNS = ['kita', 'saya', 'pemain', 'waktu', 'fokus', 'akurasi', 'kecepatan', 'ritme', 'papan', 'sirkuit', 'performa', 'hasil', 'usaha', 'langkah', 'tujuan', 'proses', 'peluang', 'pikiran', 'rekam', 'suara'];
const ID_VERBS = ['harus', 'dapat', 'bisa', 'menjadi', 'mencapai', 'meningkatkan', 'membawa', 'membuat', 'menjaga', 'melakukan', 'memiliki', 'bergerak', 'mengatur', 'melatih', 'mempertahankan'];
const ID_ADJECTIVES = ['cepat', 'baik', 'jelas', 'tinggi', 'kuat', 'konsisten', 'sempurna', 'tepat', 'mudah', 'luas', 'mantap', 'nyata', 'hebat', 'stabil', 'maksimal'];
const ID_CONNECTORS = ['dengan', 'untuk', 'pada', 'yang', 'dalam', 'secara', 'sehingga', 'serta', 'agar', 'sambil', 'karena', 'tanpa'];

// Categorized Word Buckets for English Natural Grammar Construction
const EN_NOUNS = ['racer', 'player', 'speed', 'focus', 'accuracy', 'time', 'rhythm', 'track', 'performance', 'victory', 'result', 'effort', 'mind', 'power', 'goal', 'score'];
const EN_VERBS = ['must', 'can', 'should', 'keep', 'reach', 'build', 'improve', 'create', 'maintain', 'drive', 'shift', 'boost', 'lead', 'gain'];
const EN_ADJECTIVES = ['fast', 'quick', 'clear', 'strong', 'smooth', 'perfect', 'steady', 'sharp', 'high', 'great', 'stable', 'bold'];
const EN_CONNECTORS = ['with', 'for', 'and', 'that', 'into', 'while', 'under', 'through', 'every', 'about'];

// Helper with timeout for API requests
async function fetchWithTimeout(resource: string, options: RequestInit = {}, timeoutMs = 3000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

// Fetch Quotes from Monkeytype JSON API CDN
async function fetchMonkeytypeQuotesList(lang: 'ID' | 'EN'): Promise<string[]> {
  try {
    if (lang === 'ID') {
      if (monkeytypeIdQuotesCache && monkeytypeIdQuotesCache.length > 0) return monkeytypeIdQuotesCache;
      const res = await fetchWithTimeout('https://raw.githubusercontent.com/monkeytypegame/monkeytype/master/frontend/static/quotes/indonesian.json');
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.quotes)) {
          const parsed = json.quotes.map((q: MonkeyQuote) => {
            return q.source ? `${q.text} — ${q.source}` : q.text;
          }).filter(Boolean);
          if (parsed.length > 0) {
            monkeytypeIdQuotesCache = parsed;
            return parsed;
          }
        }
      }
    } else {
      if (monkeytypeEnQuotesCache && monkeytypeEnQuotesCache.length > 0) return monkeytypeEnQuotesCache;
      const res = await fetchWithTimeout('https://raw.githubusercontent.com/monkeytypegame/monkeytype/master/frontend/static/quotes/english.json');
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.quotes)) {
          const parsed = json.quotes.map((q: MonkeyQuote) => {
            return q.source ? `${q.text} — ${q.source}` : q.text;
          }).filter(Boolean);
          if (parsed.length > 0) {
            monkeytypeEnQuotesCache = parsed;
            return parsed;
          }
        }
      }
    }
  } catch (e) {
    // API Fetch Failed
  }

  return [];
}

// Fetch Wordlist from Monkeytype CDN
async function fetchMonkeytypeWordsList(lang: 'ID' | 'EN'): Promise<string[]> {
  try {
    if (lang === 'ID') {
      if (monkeytypeIdWordsCache && monkeytypeIdWordsCache.length > 0) return monkeytypeIdWordsCache;
      const res = await fetchWithTimeout('https://raw.githubusercontent.com/monkeytypegame/monkeytype/master/frontend/static/languages/indonesian_1k.json');
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.words)) {
          monkeytypeIdWordsCache = json.words;
          return json.words;
        }
      }
    } else {
      if (monkeytypeEnWordsCache && monkeytypeEnWordsCache.length > 0) return monkeytypeEnWordsCache;
      const res = await fetchWithTimeout('https://raw.githubusercontent.com/monkeytypegame/monkeytype/master/frontend/static/languages/english.json');
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.words)) {
          monkeytypeEnWordsCache = json.words;
          return json.words;
        }
      }
    }
  } catch (e) {
    // API Fetch Failed
  }

  return [];
}

// Helper to pick random item from array
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Generate Coherent Structured Sentence Flow (Grammar Chaining)
export function generateStructuredText(lang: 'ID' | 'EN', rawWords: string[], targetLength: TextLength): string {
  const nouns = lang === 'ID' ? ID_NOUNS : EN_NOUNS;
  const verbs = lang === 'ID' ? ID_VERBS : EN_VERBS;
  const adjectives = lang === 'ID' ? ID_ADJECTIVES : EN_ADJECTIVES;
  const connectors = lang === 'ID' ? ID_CONNECTORS : EN_CONNECTORS;

  const combinedNouns = rawWords.length > 20 ? [...nouns, ...rawWords.slice(0, 100)] : nouns;
  const selected: string[] = [];

  const patternCycle = ['NOUN', 'VERB', 'ADJ', 'CONNECTOR'];
  let prevWord = '';

  for (let i = 0; i < targetLength; i++) {
    const role = patternCycle[i % patternCycle.length];
    let candidate = '';

    if (role === 'NOUN') {
      candidate = pickRandom(combinedNouns);
    } else if (role === 'VERB') {
      candidate = pickRandom(verbs);
    } else if (role === 'ADJ') {
      candidate = pickRandom(adjectives);
    } else {
      candidate = pickRandom(connectors);
    }

    while (candidate === prevWord) {
      candidate = pickRandom(combinedNouns);
    }
    prevWord = candidate;

    if (i === 0 || (i % 8 === 0 && i < targetLength - 1)) {
      candidate = candidate.charAt(0).toUpperCase() + candidate.slice(1);
    }

    selected.push(candidate);
  }

  let result = selected.join(' ');
  if (!/[.!?]$/.test(result)) {
    result += '.';
  }
  return result;
}

// Generate Balanced Keyboard Punctuation Text (Natural 1 symbol per 4-6 words)
export function generateStructuredPunctuation(lang: 'ID' | 'EN', rawWords: string[], targetLength: TextLength): string {
  const nouns = lang === 'ID' ? ID_NOUNS : EN_NOUNS;
  const verbs = lang === 'ID' ? ID_VERBS : EN_VERBS;
  const adjectives = lang === 'ID' ? ID_ADJECTIVES : EN_ADJECTIVES;
  const connectors = lang === 'ID' ? ID_CONNECTORS : EN_CONNECTORS;

  const combinedNouns = rawWords.length > 20 ? [...nouns, ...rawWords.slice(0, 100)] : nouns;
  const patternCycle = ['NOUN', 'VERB', 'ADJ', 'CONNECTOR'];

  const selected: string[] = [];
  let prevWord = '';
  let capitalizeNext = true;
  let wordsSinceSymbol = 0;
  let wordsSinceSentenceEnd = 0;

  for (let i = 0; i < targetLength; i++) {
    const role = patternCycle[i % patternCycle.length];
    let word = '';

    if (role === 'NOUN') word = pickRandom(combinedNouns);
    else if (role === 'VERB') word = pickRandom(verbs);
    else if (role === 'ADJ') word = pickRandom(adjectives);
    else word = pickRandom(connectors);

    while (word === prevWord) {
      word = pickRandom(combinedNouns);
    }
    prevWord = word;
    wordsSinceSymbol++;
    wordsSinceSentenceEnd++;

    if (capitalizeNext) {
      word = word.charAt(0).toUpperCase() + word.slice(1);
      capitalizeNext = false;
    }

    // Occasional English Contractions (e.g. don't, it's, we're)
    if (lang === 'EN' && Math.random() < 0.08) {
      const contractions = ["don't", "it's", "can't", "they're", "we'll", "you're"];
      word = pickRandom(contractions);
    }

    // Occasional Word Wrappers (Quotes, Parentheses, Brackets) ~3% chance
    if (wordsSinceSymbol >= 4 && Math.random() < 0.04 && i > 0 && i < targetLength - 1) {
      const wrapRand = Math.random();
      if (wrapRand < 0.35) word = `"${word}"`;
      else if (wrapRand < 0.60) word = `'${word}'`;
      else if (wrapRand < 0.85) word = `(${word})`;
      else word = `[${word}]`;
      wordsSinceSymbol = 0;
    }

    let pSymbol = '';
    if (i === targetLength - 1) {
      pSymbol = '.';
    } else if (wordsSinceSentenceEnd >= 7 && Math.random() < 0.40) {
      // End sentence every ~7-10 words
      pSymbol = Math.random() < 0.80 ? '.' : Math.random() < 0.5 ? '!' : '?';
      capitalizeNext = true;
      wordsSinceSentenceEnd = 0;
      wordsSinceSymbol = 0;
    } else if (wordsSinceSymbol >= 4 && Math.random() < 0.25) {
      // Sparsely add 1 intermediate punctuation symbol every 4-6 words
      const pRand = Math.random();
      if (pRand < 0.45) pSymbol = ',';
      else if (pRand < 0.65) pSymbol = ':';
      else if (pRand < 0.80) pSymbol = ' -';
      else if (pRand < 0.90) pSymbol = ';';
      else pSymbol = '/';

      wordsSinceSymbol = 0;
    }

    word += pSymbol;
    selected.push(word);
  }

  let result = selected.join(' ');
  result = result.replace(/\s+-\s+/g, ' - ').replace(/\s+/g, ' ').trim();
  if (!/[.!?"]$/.test(result)) {
    result += '.';
  }
  return result;
}

// Select quote by character length
function selectQuoteByLength(quotes: string[], targetLength: TextLength, excludeText?: string): string {
  if (!quotes || quotes.length === 0) return 'Loading quote passage...';

  const filtered = quotes.filter(q => q !== excludeText);
  if (filtered.length === 0) return quotes[0];

  let targetQuotes = filtered;
  if (targetLength <= 15) {
    targetQuotes = filtered.filter(q => q.length <= 150);
  } else if (targetLength <= 30) {
    targetQuotes = filtered.filter(q => q.length > 80 && q.length <= 350);
  } else {
    targetQuotes = filtered.filter(q => q.length > 200);
  }

  if (targetQuotes.length === 0) targetQuotes = filtered;
  return targetQuotes[Math.floor(Math.random() * targetQuotes.length)];
}

// Synchronous instant generator
export function getRandomText(
  lang: TextLanguage = 'ID',
  mode: TextMode = 'WORDS',
  length: TextLength = 25,
  excludeText?: string
): string {
  if (mode === 'CUSTOM') return excludeText || 'Type custom text passage here.';

  if (mode === 'PUNCTUATION') {
    const nouns = lang === 'ID' ? ID_NOUNS : EN_NOUNS;
    return generateStructuredPunctuation(lang, nouns, length);
  } else if (mode === 'QUOTE') {
    const defaultQuotes = lang === 'ID'
      ? ["Keberhasilan adalah kepunyaan mereka yang senantiasa berusaha. — B.J. Habibie"]
      : ["Success is not final, failure is not fatal: it is the courage to continue that counts. — Winston Churchill"];
    return selectQuoteByLength(defaultQuotes, length, excludeText);
  }

  const nouns = lang === 'ID' ? ID_NOUNS : EN_NOUNS;
  return generateStructuredText(lang, nouns, length);
}

// 100% Asynchronous API text generator driven by Language, Mode, and Length
export async function getRandomTextAsync(
  lang: TextLanguage = 'ID',
  mode: TextMode = 'WORDS',
  length: TextLength = 25,
  excludeText?: string
): Promise<string> {
  if (mode === 'CUSTOM') return excludeText || 'Type custom text passage here.';

  try {
    if (mode === 'PUNCTUATION') {
      const words = await fetchMonkeytypeWordsList(lang);
      return generateStructuredPunctuation(lang, words, length);
    } else if (mode === 'QUOTE') {
      const quotes = await fetchMonkeytypeQuotesList(lang);
      return selectQuoteByLength(quotes, length, excludeText);
    } else {
      const words = await fetchMonkeytypeWordsList(lang);
      return generateStructuredText(lang, words, length);
    }
  } catch (e) {
    // API Fallback
  }

  return getRandomText(lang, mode, length, excludeText);
}
