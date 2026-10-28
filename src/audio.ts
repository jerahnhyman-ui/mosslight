import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";

type Theme = "meadow" | "dusk" | "alpine";
type Score = {
  bpm: number;
  melody: (number | null)[];
  chords: number[][];
  voice: OscillatorType;
};
type Voice = { oscillator: OscillatorNode; gain: GainNode };

// Original eight-bar themes. All sound is synthesized locally, so the score
// works offline and adds no downloaded media or background playback session.
const scores: Record<Theme | "star", Score> = {
  meadow: {
    bpm: 104,
    voice: "triangle",
    melody: [
      [72, null, 76, 79, 76, null, 74, 72],
      [69, null, 72, 76, 74, null, 72, null],
      [71, null, 74, 79, 77, 76, 74, null],
      [72, null, 76, 74, 72, null, null, null],
      [76, null, 79, 84, 81, null, 79, 76],
      [77, null, 76, 74, 72, null, 69, null],
      [71, null, 74, 77, 79, null, 74, 71],
      [72, null, 76, 79, 72, null, null, null],
    ].flat(),
    chords: [
      [48, 52, 55],
      [45, 48, 52],
      [43, 47, 50],
      [48, 52, 55],
      [48, 52, 55],
      [41, 45, 48],
      [43, 47, 50],
      [48, 52, 55],
    ],
  },
  dusk: {
    bpm: 78,
    voice: "sine",
    melody: [
      [74, null, null, 77, 81, null, 79, null],
      [77, null, 74, null, 72, null, null, null],
      [76, null, null, 79, 81, null, 84, null],
      [81, null, 77, null, 74, null, null, null],
      [74, null, 81, null, 86, null, 84, 81],
      [79, null, null, 77, 76, null, 72, null],
      [73, null, 76, null, 81, null, 79, 76],
      [77, null, 74, null, 74, null, null, null],
    ].flat(),
    chords: [
      [50, 53, 57],
      [46, 50, 53],
      [48, 52, 55],
      [50, 53, 57],
      [43, 46, 50],
      [48, 52, 55],
      [45, 49, 52],
      [50, 53, 57],
    ],
  },
  alpine: {
    bpm: 116,
    voice: "triangle",
    melody: [
      [79, 83, 86, null, 83, null, 81, 79],
      [76, null, 79, 83, 81, null, 79, null],
      [78, 81, 86, null, 84, null, 83, 81],
      [79, null, 83, 86, 79, null, null, null],
      [83, 86, 91, null, 88, null, 86, 83],
      [84, null, 83, 81, 79, null, 76, null],
      [78, null, 81, 84, 86, 84, 81, 78],
      [79, null, 83, 86, 79, null, null, null],
    ].flat(),
    chords: [
      [43, 47, 50],
      [40, 43, 47],
      [38, 42, 45],
      [43, 47, 50],
      [43, 47, 50],
      [48, 52, 55],
      [38, 42, 45],
      [43, 47, 50],
    ],
  },
  star: {
    bpm: 148,
    voice: "triangle",
    melody: [
      [84, 88, 91, 88, 86, 89, 93, 89],
      [88, 91, 96, 91, 86, 89, 93, 89],
      [84, 88, 91, 88, 83, 86, 91, 86],
      [84, 91, 88, 96, 91, 88, 84, null],
    ].flat(),
    chords: [
      [48, 52, 55],
      [53, 57, 60],
      [43, 47, 50],
      [48, 52, 55],
    ],
  },
};

const effects: Record<string, number[]> = {
  jump: [300, 470],
  coin: [740, 1110],
  star: [660, 830, 990, 1320],
  grow: [330, 440, 550, 660],
  shrink: [440, 330, 220],
  "life-lost": [220, 165, 110],
  "extra-life": [523, 784, 1047, 1319],
  "star-end": [660, 440, 330],
  hurt: [200, 150, 95],
  stomp: [180, 400],
  checkpoint: [520, 660, 780],
  firefly: [880, 1175, 1568],
  bounce: [180, 360, 620],
  break: [160, 110, 80],
  charge: [120, 155, 190],
  crumble: [150, 115],
  win: [523, 659, 784, 1047],
  lose: [300, 240, 160],
};
const midi = (note: number) => 440 * 2 ** ((note - 69) / 12);

export class AudioPlayer {
  private effectsOn = true;
  private musicOn = true;
  private hapticsOn = true;
  private context?: AudioContext;
  private musicTimer?: ReturnType<typeof setInterval>;
  private musicVoices = new Set<Voice>();
  private effectVoices = new Set<Voice>();
  private requested = { theme: "meadow" as Theme, active: false, star: false };
  private playingScore?: Theme | "star";
  private step = 0;
  private nextNoteAt = 0;
  private lastHaptic = -Infinity;
  private lastCoinAt = -Infinity;
  private interrupted = false;

  get enabled() {
    return this.effectsOn;
  }
  set enabled(value: boolean) {
    this.effectsOn = value;
    if (!value) this.stopVoices(this.effectVoices);
  }
  get musicEnabled() {
    return this.musicOn;
  }
  set musicEnabled(value: boolean) {
    this.musicOn = value;
    this.syncMusic();
  }
  get hapticsEnabled() {
    return this.hapticsOn;
  }
  set hapticsEnabled(value: boolean) {
    this.hapticsOn = value;
  }

  /** Call from an actual gesture, including when only music is enabled. */
  unlock() {
    this.interrupted = false;
    if (!this.effectsOn && !this.musicOn) return;
    try {
      if (!this.context || this.context.state === "closed") {
        this.stopMusic();
        this.stopVoices(this.effectVoices);
        this.context = new AudioContext();
        this.lastCoinAt = -Infinity;
      }
      // Safari can report an "interrupted" state after a call or route change.
      // A genuine gesture may resume it just like a suspended context.
      if (this.context.state !== "running") {
        void this.context
          .resume()
          .then(() => this.syncMusic())
          .catch(() => {
            // A browser can reject audio until the next valid gesture.
          });
      } else {
        this.syncMusic();
      }
    } catch {
      // Gameplay and haptics remain available without Web Audio support.
    }
  }

  /** Safe to call each frame: a score has only one scheduler at a time. */
  setMusic(theme: Theme, active: boolean, starPower = false) {
    this.requested = { theme, active, star: starPower };
    this.syncMusic();
  }

  suspend() {
    this.interrupted = true;
    this.stopMusic();
    this.stopVoices(this.effectVoices);
    if (this.context?.state === "running") {
      void this.context.suspend().catch(() => {});
    }
  }

  play(event: string) {
    this.haptic(event);
    if (
      !this.effectsOn ||
      this.interrupted ||
      this.context?.state !== "running"
    )
      return;
    const notes = effects[event];
    if (!notes) return;
    if (event === "coin") {
      // Coin rooms can award a dozen coins in one frame. Play one clean chime
      // instead of layering identical notes into a sudden volume spike.
      if (this.context.currentTime - this.lastCoinAt < 0.045) return;
      this.lastCoinAt = this.context.currentTime;
    }
    const low = event === "break" || event === "crumble" || event === "hurt";
    const gentle =
      event === "coin" || event === "charge" || event === "crumble";
    for (const [index, frequency] of notes.entries()) {
      this.note(
        frequency,
        this.context.currentTime + index * 0.07,
        event === "firefly" || event === "win" ? 0.24 : 0.14,
        gentle ? 0.045 : 0.065,
        low ? "triangle" : event === "firefly" ? "sine" : "triangle",
        this.effectVoices,
        event === "bounce" || event === "jump" ? frequency * 1.12 : undefined,
      );
    }
  }

  private syncMusic() {
    const { theme, active, star } = this.requested;
    if (
      !active ||
      !this.musicOn ||
      this.interrupted ||
      this.context?.state !== "running"
    ) {
      this.stopMusic();
      return;
    }
    const selected = star ? "star" : theme;
    if (this.playingScore === selected && this.musicTimer !== undefined) return;
    this.stopMusic();
    this.playingScore = selected;
    this.step = 0;
    this.nextNoteAt = this.context.currentTime + 0.035;
    this.scheduleMusic();
    this.musicTimer = setInterval(() => this.scheduleMusic(), 90);
  }

  private scheduleMusic() {
    const context = this.context;
    if (!context || context.state !== "running" || !this.playingScore) return;
    const score = scores[this.playingScore];
    const eighth = 30 / score.bpm;
    // Never enqueue a backlog after a suspended browser/tab or blocked frame.
    if (this.nextNoteAt < context.currentTime - 0.25) {
      this.nextNoteAt = context.currentTime + 0.035;
    }
    while (this.nextNoteAt < context.currentTime + 0.22) {
      const position = this.step % score.melody.length;
      const chord =
        score.chords[Math.floor(position / 8) % score.chords.length]!;
      const melody = score.melody[position];
      const at = this.nextNoteAt;
      if (melody !== null && melody !== undefined) {
        this.note(
          midi(melody),
          at,
          eighth * 0.85,
          0.035,
          score.voice,
          this.musicVoices,
        );
      }
      // A soft bass pulse and sustained fifth keep the melody warm, not shrill.
      if (position % 4 === 0) {
        this.note(
          midi(chord[position % 8 === 0 ? 0 : 2]!),
          at,
          eighth * 2.2,
          0.035,
          "sine",
          this.musicVoices,
        );
      }
      if (position % 8 === 0) {
        for (const tone of chord.slice(1)) {
          this.note(
            midi(tone + 12),
            at,
            eighth * 6.5,
            0.009,
            "sine",
            this.musicVoices,
          );
        }
      }
      this.step++;
      this.nextNoteAt += eighth;
    }
  }

  private note(
    frequency: number,
    at: number,
    duration: number,
    volume: number,
    waveform: OscillatorType,
    voices: Set<Voice>,
    glideTo?: number,
  ) {
    const context = this.context!;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const voice = { oscillator, gain };
    oscillator.type = waveform;
    oscillator.frequency.setValueAtTime(frequency, at);
    if (glideTo)
      oscillator.frequency.exponentialRampToValueAtTime(
        glideTo,
        at + duration * 0.8,
      );
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(volume, at + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    voices.add(voice);
    oscillator.onended = () => {
      voices.delete(voice);
      oscillator.disconnect();
      gain.disconnect();
    };
    oscillator.start(at);
    oscillator.stop(at + duration + 0.015);
  }

  private stopVoices(voices: Set<Voice>) {
    for (const { oscillator, gain } of voices) {
      try {
        oscillator.stop();
      } catch {
        /* Already ended. */
      }
      oscillator.disconnect();
      gain.disconnect();
    }
    voices.clear();
  }

  private stopMusic() {
    if (this.musicTimer !== undefined) clearInterval(this.musicTimer);
    this.musicTimer = undefined;
    this.playingScore = undefined;
    this.stopVoices(this.musicVoices);
  }

  private haptic(event: string) {
    if (!this.hapticsOn || this.interrupted || !Capacitor.isNativePlatform())
      return;
    const light = ["stomp", "bounce", "grow", "break"];
    const success = ["checkpoint", "firefly", "extra-life", "win"];
    const damage = ["shrink", "hurt", "life-lost", "lose"];
    if (
      !light.includes(event) &&
      !success.includes(event) &&
      !damage.includes(event)
    )
      return;
    const now = performance.now();
    // Several bugs or life-lost + lose may be emitted in one frame.
    if (now - this.lastHaptic < 100) return;
    this.lastHaptic = now;
    const response = success.includes(event)
      ? Haptics.notification({ type: NotificationType.Success })
      : Haptics.impact({
          style: damage.includes(event)
            ? ImpactStyle.Medium
            : ImpactStyle.Light,
        });
    void response.catch(() => {
      /* Unsupported devices remain fully playable. */
    });
  }
}
