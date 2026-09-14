# TypeRacer Blitz

Minimalist, futuristic speed typing game with real-time P2P multiplayer, SVG race track visualizer, and **Monkeytype-standard metrics**.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-19-61dafb.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)
![Vite](https://img.shields.io/badge/Vite-6-646cff.svg)

---

## Features

- **Real-Time P2P Multiplayer**: Join room instantly via code/link powered by PeerJS WebRTC & WebSocket relay.
- **Monkeytype-Style Mode Selector**:
  - **Bahasa**: Indonesia (`ID`) & English (`EN`)
  - **Mode**: Words, Punctuation (rich symbol test), Quotes, Custom
  - **Kata**: 15, 25, 30, 50 words
- **100% Live API Data**: Dynamic text fetched on-demand from Monkeytype open datasets (quotes & 1k wordlists).
- **Precision Analytics**: WPM, Raw WPM, Accuracy, Consistency (Standard Deviation), and WPM timeline chart.
- **Mobile & Accessibility Ready**: Full virtual keyboard support with autocapitalize/autocorrect prevention.

---

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite 6 + TailwindCSS v4
- **State**: Zustand
- **Realtime**: PeerJS (WebRTC P2P) + HTML5 WebSocket Relay
- **Audio**: Web Audio API (Synthesized keypress & siren)

---

## Quick Start

```bash
# Clone & install dependencies
git clone https://github.com/ahmadsaif/type-racer.git
cd type-racer
npm install

# Start development server
npm run dev
```

Open `http://localhost:5173` in your browser.

### Build Production

```bash
npm run build
```

---

## License

Distributed under the MIT License.
