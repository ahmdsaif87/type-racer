class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private isBgmMuted: boolean = false;
  private isBgmRunning: boolean = false;
  private bgmGainNode: GainNode | null = null;
  private bgmFilterNode: BiquadFilterNode | null = null;
  private bgmTimer: number | null = null;

  constructor() {
    // Read mute preferences from localStorage
    const savedMute = localStorage.getItem('typeracer_muted');
    if (savedMute !== null) {
      this.isMuted = savedMute === 'true';
    }
    // BGM always defaults to OFF (muted) when entering/refreshing the web app
    this.isBgmMuted = true;
    localStorage.setItem('typeracer_bgm_muted', 'true');
  }

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    localStorage.setItem('typeracer_muted', String(this.isMuted));
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public toggleBgm(): boolean {
    this.isBgmMuted = !this.isBgmMuted;
    localStorage.setItem('typeracer_bgm_muted', String(this.isBgmMuted));
    if (this.isBgmMuted) {
      this.stopBgm();
    } else {
      this.startBgm();
    }
    return !this.isBgmMuted;
  }

  public getIsBgmActive(): boolean {
    return !this.isBgmMuted && this.isBgmRunning;
  }

  public getIsBgmMuted(): boolean {
    return this.isBgmMuted;
  }

  // Keypress sound removed completely as requested ("ganti sound yang cekrek cekrek")
  public playKeyPress() {
    // Intentionally no-op
  }

  // Modal Open Pop Sound (Soft dual chime when modal appears)
  public playModalOpen() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const freqs = [523.25, 659.25, 783.99]; // C5, E5, G5 soft chord pop

      freqs.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.04);

        gain.gain.setValueAtTime(0.1, now + idx * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + idx * 0.04);
        osc.stop(now + idx * 0.04 + 0.2);
      });
    } catch {
      // Ignore
    }
  }

  // Typo Error Buzz (When wrong letter is typed)
  public playError() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, this.ctx.currentTime);
      osc.frequency.setValueAtTime(130, this.ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.12);
    } catch {
      // Ignore
    }
  }

  // Countdown Beep (3, 2, 1)
  public playCountdownBeep() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.18);
    } catch {
      // Ignore
    }
  }

  // Countdown GO Siren!
  public playGoSiren() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, this.ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(1046.50, this.ctx.currentTime + 0.35); // C6

      gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.4);
    } catch {
      // Ignore
    }
  }

  // Finish Race Victory Chime
  public playFinishChime() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        const startTime = this.ctx.currentTime + idx * 0.08;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.2, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.4);
      });
    } catch {
      // Ignore
    }
  }

  // Authentic Lofi Hip-Hop Chill Beat Generator (Procedural Web Audio API)
  private vinylSource: AudioBufferSourceNode | null = null;

  public startBgm() {
    if (this.isBgmMuted) return;
    if (this.isBgmRunning) {
      this.initCtx();
      return;
    }
    try {
      this.initCtx();
      if (!this.ctx) return;

      this.isBgmRunning = true;
      const ctx = this.ctx;

      // Master BGM gain & warm lowpass filter (Classic Lofi Muffled Tone)
      this.bgmFilterNode = ctx.createBiquadFilter();
      this.bgmFilterNode.type = 'lowpass';
      this.bgmFilterNode.frequency.setValueAtTime(650, ctx.currentTime);

      this.bgmGainNode = ctx.createGain();
      this.bgmGainNode.gain.setValueAtTime(0.22, ctx.currentTime); // Punchier, clearly audible mix

      this.bgmFilterNode.connect(this.bgmGainNode);
      this.bgmGainNode.connect(ctx.destination);

      // 1. Gentle Vinyl Crackle / Rain Texture
      try {
        const bufferSize = ctx.sampleRate * 2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          const rand = Math.random();
          if (rand > 0.998) {
            data[i] = (Math.random() - 0.5) * 0.4;
          } else {
            data[i] = (Math.random() - 0.5) * 0.02;
          }
        }
        this.vinylSource = ctx.createBufferSource();
        this.vinylSource.buffer = buffer;
        this.vinylSource.loop = true;
        const vinylGain = ctx.createGain();
        vinylGain.gain.setValueAtTime(0.02, ctx.currentTime);
        this.vinylSource.connect(vinylGain);
        vinylGain.connect(this.bgmFilterNode);
        this.vinylSource.start();
      } catch {
        // Ignore vinyl texture if buffer fails
      }

      // 2. Lofi Jazz Rhodes Chord Progression (Dbmaj7 -> Bbm9 -> Ebm9 -> Ab7sus)
      const lofiChords = [
        [138.59, 207.65, 261.63, 329.63], // Dbmaj7 (Db3, Ab3, C4, E4)
        [116.54, 174.61, 220.00, 261.63], // Bbm9 (Bb2, F3, A3, C4)
        [155.56, 233.08, 277.18, 349.23], // Ebm9 (Eb3, Bb3, Db4, F4)
        [103.83, 155.56, 207.65, 277.18], // Ab7sus (Ab2, Eb3, Ab3, Db4)
      ];

      let barIndex = 0;
      const barDurationSec = 3.6; // ~66 BPM Lofi Chill Tempo

      // Helpers for Lofi Drums
      const playKick = (time: number) => {
        if (!this.ctx || !this.bgmGainNode) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.frequency.setValueAtTime(90, time);
        osc.frequency.exponentialRampToValueAtTime(32, time + 0.14);
        gain.gain.setValueAtTime(0.25, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);
        osc.connect(gain);
        gain.connect(this.bgmGainNode);
        osc.start(time);
        osc.stop(time + 0.18);
      };

      const playSnare = (time: number) => {
        if (!this.ctx || !this.bgmGainNode) return;
        try {
          const bufSize = Math.floor(this.ctx.sampleRate * 0.09);
          const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
          const data = buf.getChannelData(0);
          for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
          const noise = this.ctx.createBufferSource();
          noise.buffer = buf;
          const bandpass = this.ctx.createBiquadFilter();
          bandpass.type = 'bandpass';
          bandpass.frequency.setValueAtTime(1000, time);
          const gain = this.ctx.createGain();
          gain.gain.setValueAtTime(0.10, time);
          gain.gain.exponentialRampToValueAtTime(0.001, time + 0.09);
          noise.connect(bandpass);
          bandpass.connect(gain);
          gain.connect(this.bgmGainNode);
          noise.start(time);
          noise.stop(time + 0.1);
        } catch {
          // Ignore
        }
      };

      const playHiHat = (time: number, vol = 0.03) => {
        if (!this.ctx || !this.bgmGainNode) return;
        try {
          const bufSize = Math.floor(this.ctx.sampleRate * 0.03);
          const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
          const data = buf.getChannelData(0);
          for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
          const noise = this.ctx.createBufferSource();
          noise.buffer = buf;
          const highpass = this.ctx.createBiquadFilter();
          highpass.type = 'highpass';
          highpass.frequency.setValueAtTime(6500, time);
          const gain = this.ctx.createGain();
          gain.gain.setValueAtTime(vol, time);
          gain.gain.exponentialRampToValueAtTime(0.001, time + 0.035);
          noise.connect(highpass);
          highpass.connect(gain);
          gain.connect(this.bgmGainNode);
          noise.start(time);
          noise.stop(time + 0.04);
        } catch {
          // Ignore
        }
      };

      const playLofiLoop = () => {
        if (!this.isBgmRunning || !this.ctx || !this.bgmFilterNode) return;

        const now = this.ctx.currentTime;
        const currentChord = lofiChords[barIndex];

        // Play Rhodes-style warmth chord
        currentChord.forEach((freq) => {
          if (!this.ctx || !this.bgmFilterNode) return;
          const osc = this.ctx.createOscillator();
          const oscGain = this.ctx.createGain();

          osc.type = 'triangle';
          // Detune for tape wobble / vinyl warmth
          osc.frequency.setValueAtTime(freq * (1 + (Math.random() - 0.5) * 0.004), now);

          oscGain.gain.setValueAtTime(0.001, now);
          oscGain.gain.linearRampToValueAtTime(0.12, now + 0.6);
          oscGain.gain.exponentialRampToValueAtTime(0.001, now + barDurationSec + 0.3);

          osc.connect(oscGain);
          oscGain.connect(this.bgmFilterNode);

          osc.start(now);
          osc.stop(now + barDurationSec + 0.4);
        });

        // Play Lofi Beat Pattern over 1 Bar (3.6s)
        const beatStep = barDurationSec / 4; // ~0.9s per beat
        
        // Kicks on beat 1 & beat 3.5
        playKick(now);
        playKick(now + beatStep * 2.5);

        // Snares on beat 2 & beat 4
        playSnare(now + beatStep * 1.0);
        playSnare(now + beatStep * 3.0);

        // Relaxed swing Hi-hats on 8th notes
        for (let b = 0; b < 8; b++) {
          const swingOffset = b % 2 === 1 ? 0.04 : 0; // Swing feel
          const hhTime = now + (b * (beatStep / 2)) + swingOffset;
          const hhVol = b % 2 === 0 ? 0.035 : 0.020;
          playHiHat(hhTime, hhVol);
        }

        // Occasional melodic lofi chime/lead note
        if (Math.random() > 0.35) {
          const leadFreq = currentChord[Math.floor(Math.random() * currentChord.length)] * 2;
          const leadOsc = this.ctx.createOscillator();
          const leadGain = this.ctx.createGain();

          leadOsc.type = 'sine';
          leadOsc.frequency.setValueAtTime(leadFreq, now + beatStep * 1.5);

          leadGain.gain.setValueAtTime(0.001, now + beatStep * 1.5);
          leadGain.gain.linearRampToValueAtTime(0.035, now + beatStep * 1.7);
          leadGain.gain.exponentialRampToValueAtTime(0.001, now + beatStep * 3.2);

          leadOsc.connect(leadGain);
          leadGain.connect(this.bgmFilterNode);

          leadOsc.start(now + beatStep * 1.5);
          leadOsc.stop(now + beatStep * 3.3);
        }

        barIndex = (barIndex + 1) % lofiChords.length;
      };

      playLofiLoop();
      this.bgmTimer = window.setInterval(playLofiLoop, Math.floor(barDurationSec * 1000));
    } catch {
      // Ignore audio errors
    }
  }

  public stopBgm() {
    this.isBgmRunning = false;
    if (this.bgmTimer !== null) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
    if (this.vinylSource) {
      try {
        this.vinylSource.stop();
        this.vinylSource.disconnect();
      } catch {
        // Ignore
      }
      this.vinylSource = null;
    }
    if (this.bgmGainNode && this.ctx) {
      try {
        this.bgmGainNode.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);
      } catch {
        // Ignore
      }
      this.bgmGainNode = null;
    }
  }
}

export const soundEngine = new SoundEngine();

