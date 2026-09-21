import rickAndMortyThemeCleanUrl from '../data/rick_and_morty_theme.mp3';
import rickAndMortyThemeUrl from '../data/Rick and Morty Theme.mp3';

/**
 * Sound Service - Dimension Raid
 * Combines the official Rick and Morty Theme soundtrack with Web Audio API SFX.
 */

class SoundService {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.bgmTimer = null;
    this.bgmActive = false;
    this.bgmStep = 0;
    this.bgmTheme = 'level';
    this.musicGain = null;
    this.themeAudio = null;
    this.userInteracted = false;
  }

  _initThemeAudio() {
    if (!this.themeAudio && typeof window !== 'undefined') {
      try {
        const audio = new Audio();
        const sources = [
          rickAndMortyThemeCleanUrl,
          rickAndMortyThemeUrl,
          '/rick_and_morty_theme.mp3',
          '/Rick%20and%20Morty%20Theme.mp3',
          '/Rick and Morty Theme.mp3'
        ].filter(Boolean);

        let srcIdx = 0;
        audio.src = sources[srcIdx];
        audio.loop = true;
        audio.volume = this.muted ? 0 : 0.55;
        audio.preload = 'auto';

        audio.addEventListener('error', (e) => {
          srcIdx++;
          if (srcIdx < sources.length) {
            console.warn(`[Audio] Theme source error, switching to fallback ${sources[srcIdx]}`);
            audio.src = sources[srcIdx];
            if (this.bgmActive && !this.muted) {
              audio.play().catch(() => {});
            }
          } else {
            console.error('[Audio] All theme audio sources failed to load:', e);
          }
        });

        audio.addEventListener('canplaythrough', () => {
          if (this.bgmActive && audio.paused && !this.muted) {
            audio.play().catch(() => {});
          }
        });

        this.themeAudio = audio;
      } catch (err) {
        console.warn('Could not initialize Rick and Morty Theme audio element:', err);
      }
    }
  }

  enableAudioOnUserGesture() {
    this.init();
    if (this.themeAudio && this.bgmActive && this.themeAudio.paused && !this.muted) {
      this.themeAudio.play().catch(() => {});
    }
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.setValueAtTime(this.muted ? 0 : 0.16, this.ctx.currentTime);
        this.musicGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  setMuted(isMuted) {
    this.muted = isMuted;
    if (this.themeAudio) {
      this.themeAudio.muted = isMuted;
      this.themeAudio.volume = isMuted ? 0 : (this.bgmTheme === 'boss' ? 0.55 : 0.45);
    }
    if (this.musicGain && this.ctx) {
      try {
        this.musicGain.gain.setValueAtTime(isMuted ? 0 : 0.16, this.ctx.currentTime);
      } catch {}
    }
  }

  isMuted() {
    return this.muted;
  }

  /**
   * Rick's iconic laser blaster sound
   */
  playLaser() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.12);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch {}
  }

  /**
   * Morty's twin plasma blaster sound
   */
  playMortyBlaster() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(620, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.09);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.09);
    } catch {}
  }

  /**
   * Character swap portal sound (interdimensional whoosh)
   */
  playPortalSwap() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.28);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(600, now);
      filter.Q.setValueAtTime(3.5, now);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.linearRampToValueAtTime(0.35, now + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.3);
    } catch {}
  }

  /**
   * Special skill activation sound (Rick Portal Jump / Morty Death Crystal)
   */
  playSpecialSkill(type = 'rick') {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      if (type === 'rick') {
        // High-tech portal warp
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(350, now);
        osc1.frequency.exponentialRampToValueAtTime(1400, now + 0.22);

        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(700, now);
        osc2.frequency.exponentialRampToValueAtTime(2800, now + 0.22);
      } else {
        // Death Crystal mystic resonance
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(523.25, now); // C5
        osc1.frequency.setValueAtTime(659.25, now + 0.08); // E5
        osc1.frequency.setValueAtTime(783.99, now + 0.16); // G5
        osc1.frequency.setValueAtTime(1046.5, now + 0.24); // C6

        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1046.5, now);
        osc2.frequency.exponentialRampToValueAtTime(2093.0, now + 0.3);
      }

      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.35);
      osc2.stop(now + 0.35);
    } catch {}
  }

  /**
   * Player jump sound
   */
  playJump(isDouble = false) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = isDouble ? 'triangle' : 'sine';
      const baseFreq = isDouble ? 340 : 220;
      const endFreq = isDouble ? 680 : 440;

      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.1);

      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.1);
    } catch {}
  }

  /**
   * Enemy hit crunchy feedback
   */
  playEnemyHit() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.06);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.06);
    } catch {}
  }

  /**
   * Enemy disintegration / explosion
   */
  playExplosion(isBoss = false) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const duration = isBoss ? 0.45 : 0.22;
      const bufferSize = Math.floor(this.ctx.sampleRate * duration);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(isBoss ? 450 : 800, now);
      filter.frequency.exponentialRampToValueAtTime(50, now + duration);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(isBoss ? 0.35 : 0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(now);
    } catch {}
  }

  /**
   * Powerup pickup sound (chime)
   */
  playPowerup() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880.0, now + 0.08); // A5
      osc.frequency.setValueAtTime(1174.66, now + 0.16); // D6

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch {}
  }

  /**
   * Player hurt sound
   */
  playPlayerHurt() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.15);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.15);
    } catch {}
  }

  /**
   * Enemy telegraph warning beep (laser sight targeting)
   */
  playTelegraph() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.setValueAtTime(1600, now + 0.04);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);
    } catch {}
  }

  /**
   * Shield deflection sound (metallic ping)
   */
  playShieldDeflect() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1800, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.1);
    } catch {}
  }

  /**
   * Boss ground pound / shockwave rumble
   */
  playShockwave() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.35);

      gain.gain.setValueAtTime(0.32, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch {}
  }

  /**
   * Meeseeks frenzy roar ("EXISTENCE IS PAIN!")
   */
  playFrenzyRoar() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.linearRampToValueAtTime(640, now + 0.15);
      osc.frequency.linearRampToValueAtTime(240, now + 0.3);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800, now);
      filter.Q.setValueAtTime(5, now);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.3);
    } catch {}
  }

  /**
   * Pickle Rick transformation roar ("I'M PICKLE RICK!")
   * Power chord with laser harmonic discharge
   */
  playPickleRoar() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      [220, 277.18, 329.63, 440].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + idx * 0.04);
        osc.frequency.exponentialRampToValueAtTime(freq * 2.2, now + 0.45);

        gain.gain.setValueAtTime(0.2, now + idx * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.04);
        osc.stop(now + 0.6);
      });
    } catch {}
  }

  /**
   * Breakable crate splintering sound
   */
  playCrateBreak() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.16);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.16);
    } catch {}
  }

  /**
   * Geothermal steam vent catapult blast sound
   */
  playSteamVent() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(480, now + 0.28);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600, now);
      filter.frequency.linearRampToValueAtTime(1800, now + 0.2);

      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } catch {}
  }

  /**
   * Start Rick and Morty Theme soundtrack with dynamic boss tempo modulation
   * @param {'level' | 'boss'} theme
   */
  startMusic(theme = 'level') {
    this.init();
    this._initThemeAudio();

    if (this.bgmActive && this.bgmTheme === theme) {
      if (this.themeAudio && this.themeAudio.paused && !this.muted) {
        this.themeAudio.play().catch(() => {});
      }
      return;
    }
    this.stopMusic();

    this.bgmActive = true;
    this.bgmTheme = theme;

    // 1. Play authentic Rick and Morty Theme.mp3
    if (this.themeAudio) {
      try {
        this.themeAudio.muted = this.muted;
        this.themeAudio.volume = this.muted ? 0 : (theme === 'boss' ? 0.55 : 0.45);
        this.themeAudio.playbackRate = theme === 'boss' ? 1.15 : 1.0;

        const playPromise = this.themeAudio.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            // Autoplay policy: unlock when user interacts with document
            const unlockPlayback = () => {
              if (this.bgmActive && this.themeAudio && !this.muted) {
                this.themeAudio.play().catch(() => {});
              }
              window.removeEventListener('click', unlockPlayback);
              window.removeEventListener('keydown', unlockPlayback);
              window.removeEventListener('touchstart', unlockPlayback);
            };
            window.addEventListener('click', unlockPlayback, { once: true });
            window.addEventListener('keydown', unlockPlayback, { once: true });
            window.addEventListener('touchstart', unlockPlayback, { once: true });
          });
        }
      } catch (err) {
        console.warn('Playback error:', err);
      }
    }

    // 2. Boss Arena extra adrenal synth layer
    if (theme === 'boss' && this.ctx) {
      this.bgmStep = 0;
      const stepIntervalMs = (60 / 160 / 4) * 1000;
      this.bgmTimer = setInterval(() => {
        this._tickMusic();
      }, stepIntervalMs);
    }
  }

  /**
   * Stop background soundtrack and reset position
   */
  stopMusic() {
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
    if (this.themeAudio) {
      try {
        this.themeAudio.pause();
        this.themeAudio.currentTime = 0;
      } catch {}
    }
    this.bgmActive = false;
  }

  /**
   * Pause background soundtrack (preserves playback position)
   */
  pauseMusic() {
    if (this.themeAudio) {
      try {
        this.themeAudio.pause();
      } catch {}
    }
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  /**
   * Resume background soundtrack from paused position
   */
  resumeMusic() {
    if (this.muted || !this.bgmActive) return;
    if (this.themeAudio) {
      this.themeAudio.play().catch(() => {});
    }
    if (this.bgmTheme === 'boss' && !this.bgmTimer && this.ctx) {
      const stepIntervalMs = (60 / 160 / 4) * 1000;
      this.bgmTimer = setInterval(() => {
        this._tickMusic();
      }, stepIntervalMs);
    }
  }

  /**
   * Synthesizes 1 step of the 16-step BGM loop
   * @private
   */
  _tickMusic() {
    if (this.muted || !this.ctx || !this.bgmActive) return;

    try {
      const now = this.ctx.currentTime;
      const step = this.bgmStep % 16;
      const isBoss = this.bgmTheme === 'boss';

      // 1. Synth Bassline
      const bassNotesLevel = [73.42, 0, 73.42, 0, 87.31, 0, 98.00, 0, 65.41, 0, 65.41, 0, 73.42, 0, 82.41, 98.00];
      const bassNotesBoss = [73.42, 73.42, 77.78, 77.78, 87.31, 87.31, 103.83, 103.83, 73.42, 73.42, 77.78, 77.78, 87.31, 87.31, 110.00, 103.83];
      const bassFreq = isBoss ? bassNotesBoss[step] : bassNotesLevel[step];

      if (bassFreq > 0) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = isBoss ? 'sawtooth' : 'triangle';
        osc.frequency.setValueAtTime(bassFreq, now);

        const dur = isBoss ? 0.11 : 0.16;
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

        osc.connect(gain);
        gain.connect(this.musicGain || this.ctx.destination);
        osc.start(now);
        osc.stop(now + dur);
      }

      // 2. Cosmic Synth Arpeggio / Rick & Morty Theme Motif
      const leadNotesLevel = [293.66, 349.23, 392.00, 415.30, 440.00, 392.00, 349.23, 293.66, 261.63, 329.63, 392.00, 440.00, 523.25, 440.00, 392.00, 349.23];
      const leadNotesBoss = [293.66, 311.13, 349.23, 370.00, 415.30, 440.00, 493.88, 523.25, 587.33, 523.25, 493.88, 440.00, 415.30, 370.00, 349.23, 311.13];
      const leadFreq = isBoss ? leadNotesBoss[step] : leadNotesLevel[step];

      if (leadFreq > 0 && (step % 2 === 0 || isBoss)) {
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(leadFreq, now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(isBoss ? 2400 : 1600, now);

        const dur = 0.12;
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain || this.ctx.destination);
        osc.start(now);
        osc.stop(now + dur);
      }

      // 3. Chiptune Percussion (Kick, Snare, Hi-Hat)
      // Kick drum on 0, 8 (and 4, 12 in Boss)
      if (step === 0 || step === 8 || (isBoss && (step === 4 || step === 12))) {
        const kickOsc = this.ctx.createOscillator();
        const kickGain = this.ctx.createGain();
        kickOsc.frequency.setValueAtTime(140, now);
        kickOsc.frequency.exponentialRampToValueAtTime(35, now + 0.1);
        kickGain.gain.setValueAtTime(0.25, now);
        kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        kickOsc.connect(kickGain);
        kickGain.connect(this.musicGain || this.ctx.destination);
        kickOsc.start(now);
        kickOsc.stop(now + 0.1);
      }

      // Snare on 4, 12
      if (step === 4 || step === 12) {
        const snareOsc = this.ctx.createOscillator();
        const snareGain = this.ctx.createGain();
        snareOsc.type = 'triangle';
        snareOsc.frequency.setValueAtTime(220, now);
        snareGain.gain.setValueAtTime(0.18, now);
        snareGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        snareOsc.connect(snareGain);
        snareGain.connect(this.musicGain || this.ctx.destination);
        snareOsc.start(now);
        snareOsc.stop(now + 0.12);
      }

      this.bgmStep++;
    } catch {}
  }
}

export const soundManager = new SoundService();
