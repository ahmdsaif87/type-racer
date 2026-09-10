# Product Requirement Document (PRD)

## Project Overview

* **Product Name:** TypeRacer Blitz (Speed Racer Typing Test Multiplayer)
* **Platform:** Web Application (Responsive SPA - Mobile & Desktop)
* **Tech Stack:** Vite 6 + React 19 (TypeScript), Tailwind CSS v4, Zustand, PeerJS (WebRTC P2P) + Node WebSocket Relay Server
* **Objective:** Menyediakan platform latihan mengetik cepat yang kompetitif, interaktif, presisi, dan ringan melalui visual balapan mobil real-time antar-pemain tanpa registrasi.

---

## Target Audience & Personas

* **Casual Gamers & Friends:** Bermain game ngetik instan bersama teman via salin kode room (`RACE-XXXX`).
* **Typing Enthusiasts & Developers:** Melatih akurasi dan kecepatan ketik (WPM) dengan metrik standar **Monkeytype.com**, grafik timeline SVG, dan feedback suara audio mekanikal.

---

## User Stories & Scope Status

| ID | User Story | Status |
|---|---|---|
| US-01 | Sebagai pemain, saya ingin membuat dan menyalin kode room dengan cepat agar bisa langsung tanding dengan teman. | ✅ Done (Copy Room Code `RACE-XXXX`) |
| US-02 | Sebagai pemain, saya ingin melihat mobil saya dan lawan bergerak maju secara real-time di lintasan balap saat mengetik. | ✅ Done (Multi-lane SVG Cars) |
| US-03 | Sebagai pemain, saya ingin teks yang saya ketik memiliki penanda visual jelas (benar, salah, kursor) agar tahu letak typo seketika. | ✅ Done |
| US-04 | Sebagai host, saya ingin memulai countdown 3-2-1 secara sinkron untuk memastikan semua pemain start di waktu yang sama. | ✅ Done |
| US-05 | Sebagai pemain, saya ingin melihat podium hasil akhir (Juara 1–3, WPM, Akurasi, Consistency, Grafik SVG) setelah race selesai. | ✅ Done |
| US-06 | Sebagai pemain, saya ingin ada efek suara keyboard dan balapan yang bisa di-mute agar sesi bermain lebih hidup. | ✅ Done |
| US-07 | Sebagai host, saya ingin memilih panjang teks (15, 25, 50 kata), bahasa (Indonesia / English), atau kustom teks passage. | ✅ Done |
| US-08 | Sebagai pemain, saya ingin kustomisasi warna mobil dan nama alias sebelum masuk race. | ✅ Done |
| US-09 | Sebagai pemain mobile (HP), saya ingin mengetik dengan nyaman di keyboard HP tanpa autocorrect/capitalization pengganggu dan fungsi Backspace yang lancar. | ✅ Done (Native Full-Overlay Input `z-10`) |
| US-10 | Sebagai host, saya ingin memiliki wewenang eksklusif (Host Authority) untuk mengatur room dan memulai balapan/next race. | ✅ Done |

---

## Technical Architecture & Specifications

### 1. Client Architecture
* **Framework:** React 19 via Vite 6 (TypeScript).
* **State Management:** Zustand
  * `useTypingStore`: Mengelola teks aktif, index karakter saat ini, jumlah typo, input value, WPM history per detik, dan metrik Monkeytype.
  * `useRaceStore`: Mengelola status room, daftar pemain, timestamp urutan join (`joinedAt`), status countdown, dan posisi mobil lawan.
* **Styling & Effects:** Tailwind CSS v4 + Canvas 2D **Antigravity Particle System** (orbital physics & mouse repulsion).
* **Audio Engine:** HTML5 Web Audio Synthesizer (Keypress & Start Siren sounds).

### 2. Hybrid Real-Time Architecture

Arsitektur sinkronisasi multi-layer untuk menjamin konektivitas lintas perangkat (HP 4G/5G, Laptop Wi-Fi):

```text
[ Client Device A (Host) ] ──┬──> [ Node WebSocket Server Relay (/ws) ] ──┬──> [ Client Device B (Guest) ]
                            ├──> [ PeerJS WebRTC P2P DataChannel ]    ──┤
                            └──> [ BroadcastChannel (Same-Browser Tab) ] ┘
```

#### Real-Time Event Payloads

##### A. Player State Schema
```typescript
export interface Player {
  id: string;
  name: string;
  color: CarColorId;
  isHost: boolean;
  isReady: boolean;
  progress: number; // 0 - 100
  wpm: number;
  accuracy: number;
  isFinished: boolean;
  finishTime?: number;
  correctCharIndex: number;
  errorCount: number;
  totalKeystrokes: number;
  joinedAt?: number;
}
```

##### B. Broadcast Progress Payload (Throttled 150ms)
```json
{
  "event": "player_progress",
  "payload": {
    "roomId": "RACE-9481",
    "playerId": "p-94810",
    "progress": 46.5,
    "wpm": 82,
    "accuracy": 98,
    "isFinished": false
  }
}
```

##### C. Room State Flow Event
```json
{
  "event": "room_state_change",
  "payload": {
    "roomId": "RACE-9481",
    "status": "LOBBY" | "COUNTDOWN" | "IN_RACE" | "FINISHED",
    "targetText": "string",
    "countdownSec": 3
  }
}
```

---

## Core Formulas & Calculation Logic (Monkeytype Standard)

* **Elapsed Time (Minutes):**
$$t_{\text{min}} = \max\left(0.001, \frac{t_{\text{now}} - t_{\text{start}}}{60000}\right)$$

* **Raw WPM (Monkeytype Formula):**
$$\text{Raw WPM} = \text{round}\left(\frac{\text{Total Keystrokes} / 5}{t_{\text{min}}}\right)$$

* **Net WPM (Metrik Balapan Utama):**
$$\text{Net WPM} = \max\left(0, \text{round}\left(\frac{\text{Karakter Benar} / 5}{t_{\text{min}}}\right)\right)$$

* **Progress Percentage:**
$$\text{Progress (\%)} = \min\left(100, \left(\frac{\text{Karakter Benar}}{\text{Total Panjang Teks}}\right) \times 100\right)$$

* **Accuracy Percentage:**
$$\text{Akurasi (\%)} = \min\left(100, \text{round}\left(\frac{\text{Karakter Benar}}{\text{Total Keystrokes}}\right) \times 100\right)$$

* **Consistency Percentage (Monkeytype Formula):**
$$\text{Consistency (\%)} = \max\left(0, \min\left(100, \text{round}\left((1 - \text{CV}) \times 100\right)\right)\right)$$
*di mana $\text{CV} = \frac{\sigma}{\mu}$ (Coefficient of Variation dari sampel WPM per detik).*

---

## Mobile Virtual Keyboard Specifications

1. **Full-Box Invisible Native Input Overlay**:
   `<input className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-text select-text" />`
   Menjamin browser seluler (Android Chrome / iOS Safari / Gboard) membaca input secara native dengan koordinat sentuh asli.
2. **Anti-Autocorrect & Anti-Capitalization Attributes**:
   - `inputMode="text"`
   - `autocapitalize="none"` / `autoCapitalize="none"`
   - `autocorrect="off"` / `autoCorrect="off"`
   - `autocomplete="off"` / `autoComplete="off"`
   - `spellcheck="false"`
3. **Smart Punctuation Sanitization**:
   Mengubah otomatis tanda petik miring khas HP (`’` → `'`, `”` → `"`) sebelum evaluasi karakter.

---

## Non-Functional Requirements & Performance Targets

* **Bundle Size:** Single JS bundle < 110 KB gzipped (`dist/assets/index-*.js`).
* **Client Latency:** Respons input ketikan < 16ms (zero visible lag).
* **Accessibility:** Rasio kontras teks tombol utama terhadap latar belakang memenuhi standar **WCAG AAA (> 7:1)**.
* **Storage:** Menyimpan alias pemain, warna mobil, tema, dan bahasa di `localStorage` & `sessionStorage`.
