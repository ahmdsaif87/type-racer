# TypeRacer Blitz

**TypeRacer Blitz** adalah aplikasi web latihan dan balapan mengetik cepat (speed typing test) berdesain futuristik dan minimalis dengan dukungan **Multiplayer Real-time**, visualisasi balap mobil, serta metrik perhitungan yang presisi sesuai standar **Monkeytype.com**.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-19.0-61dafb.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)
![Vite](https://img.shields.io/badge/Vite-6.0-646cff.svg)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.0-38bdf8.svg)

---

## Fitur Utama

- **Multiplayer Real-Time P2P & WebSocket**: Main bareng kawan secara instan lewat kode room tanpa login/registrasi. Menggunakan arsitektur hybrid **PeerJS WebRTC P2P DataChannels** dan **Node WebSocket Relay Server** yang siap digunakan di HP (kuota 4G/5G) maupun Laptop.
- **Formula Presisi Standar Monkeytype**:
  - **Net WPM**: `(Karakter Benar / 5) / Waktu (Menit)`
  - **Raw WPM**: `(Total Keystrokes / 5) / Waktu (Menit)`
  - **Accuracy**: `(Karakter Benar / Total Keystrokes) * 100`
  - **Consistency**: `(1 - Standard Deviation / Mean) * 100` (berdasarkan sampel WPM per detik).
- **Antigravity Particle Background**: Animasi partikel 2D Canvas interaktif bergaya Google Antigravity (`antigravity.google`) yang bergerak mengikuti kursor dan bereaksi terhadap gerakan mouse.
- **Mobile Virtual Keyboard & Accessibility Support**:
  - Full-box invisible overlay native input (`z-10 cursor-text`).
  - Mencegah *auto-capitalization* & *autocorrect* pengganggu pada Gboard / iOS Safari via `autocapitalize="none"`, `autocorrect="off"`, `inputMode="text"`.
  - Normalisasi *smart quotes* (`’` → `'`, `”` → `"`).
  - Penanganan tombol **Backspace** yang mulus di perangkat seluler.
- **Lintasan Balap & Kustomisasi Mobil**:
  - 6 Pilihan warna mobil balap dengan animasi mesin dan knalpot SVG.
  - Urutan jalur lintasan balap terorganisir: **Lane 1 (Host)**, **Lane 2 (Joiner 1)**, **Lane 3 (Joiner 2)** berdasarkan urutan join.
- **Host Authority System**:
  - Host memegang kontrol penuh atas pengaturan bahasa (Indonesia / Inggris / Custom Text), panjang kata (15, 25, 50 kata), memulai balapan, serta opsi *Next Race / Retake*.
- **Grafik & Metrik Lengkap (Monkeytype Style)**:
  - Timeline statistik per detik disajikan dalam grafik kurva SVG yang dinamis.
  - Rincian rasion karakter: `Benar / Salah / Ekstra / Sisa`.

---

## Teknologi yang Digunakan

- **Core Framework**: React 19 + TypeScript + Vite 6
- **Styling**: Vanilla CSS Variables + TailwindCSS v4
- **State Management**: Zustand
- **Real-Time Engine**: PeerJS (WebRTC P2P), HTML5 WebSocket, BroadcastChannel API
- **Icons**: Lucide React
- **Audio**: HTML5 Web Audio Engine (Custom synthesized keypress & start siren sounds)

---

## Struktur Direktori

```text
type-racer/
├── src/
│   ├── components/
│   │   ├── AntigravityParticles.tsx  # Interactive Canvas particle background
│   │   ├── CarAvatar.tsx             # Animated SVG race car component
│   │   ├── CountdownOverlay.tsx      # 3... 2... 1... GO! Overlay
│   │   ├── LandingPage.tsx           # Home view (Alias, Color, Room Join)
│   │   ├── LoadingScreen.tsx         # Boot & transition loader
│   │   ├── LobbyView.tsx             # Room lobby & Host controls
│   │   ├── PostRaceModal.tsx         # Results leaderboard & SVG WPM graph
│   │   ├── RaceTrack.tsx             # Multi-lane racetrack visualization
│   │   ├── TelemetryHUD.tsx          # Live WPM & Timer HUD
│   │   └── TypingBox.tsx             # Core passage & mobile-friendly typing box
│   ├── data/
│   │   ├── i18n.ts                   # Multi-language translations (ID / EN)
│   │   └── texts.ts                  # Typing passages & car presets
│   ├── services/
│   │   ├── audio.ts                  # Web Audio synthesizer
│   │   └── realtime.ts               # WebRTC P2P + WebSocket Realtime engine
│   ├── store/
│   │   ├── useRaceStore.ts           # Room & multiplayer state (Zustand)
│   │   └── useTypingStore.ts         # Typing logic & Monkeytype formulas
│   ├── types/
│   │   └── game.ts                   # TypeScript interfaces
│   ├── App.tsx                       # Main application shell
│   ├── main.tsx                      # Entry point
│   └── index.css                     # Design system tokens & utility classes
├── vite.config.ts                    # Vite config with WebSocket relay plugin
└── package.json
```

---

## Jalankan Secara Lokal

### Prerequisites
- Node.js (v18.x atau lebih baru)
- npm / pnpm / yarn

### 1. Clone Repository & Install Dependensi
```bash
git clone https://github.com/ahmadsaif/type-racer.git
cd type-racer
npm install
```

### 2. Jalankan Server Dev Mode
```bash
npm run dev
```
Akses di browser: `http://localhost:5173`

### 3. Build & Preview Mode Produksi
```bash
npm run build
npx vite preview --host 0.0.0.0 --port 5173
```

---

## Lisensi

Distributed under the MIT License. See `LICENSE` for more information.
