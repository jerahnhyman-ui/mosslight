import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Capacitor } from "@capacitor/core";
import { Haptics } from "@capacitor/haptics";
import { AudioPlayer } from "./audio";

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: vi.fn(() => false) },
}));
vi.mock("@capacitor/haptics", () => ({
  Haptics: {
    impact: vi.fn(() => Promise.resolve()),
    notification: vi.fn(() => Promise.resolve()),
  },
  ImpactStyle: { Light: "LIGHT", Medium: "MEDIUM" },
  NotificationType: { Success: "SUCCESS" },
}));

class FakeOscillator {
  type = "sine";
  frequency = {
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  };
  connect = vi.fn();
  disconnect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
  onended: (() => void) | null = null;
}
class FakeContext {
  static instances: FakeContext[] = [];
  state = "running";
  destination = {};
  oscillators: FakeOscillator[] = [];
  get currentTime() {
    return Date.now() / 1000;
  }
  constructor() {
    FakeContext.instances.push(this);
  }
  resume = vi.fn(async () => {
    this.state = "running";
  });
  suspend = vi.fn(async () => {
    this.state = "suspended";
  });
  createOscillator() {
    const oscillator = new FakeOscillator();
    this.oscillators.push(oscillator);
    return oscillator;
  }
  createGain() {
    return {
      gain: {
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
  }
}
const context = () => FakeContext.instances.at(-1)!;
const firstFrequency = (oscillator: FakeOscillator) =>
  oscillator.frequency.setValueAtTime.mock.calls[0]?.[0];

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
  FakeContext.instances = [];
  vi.stubGlobal("AudioContext", FakeContext);
  vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
  vi.mocked(Haptics.impact).mockClear();
  vi.mocked(Haptics.notification).mockClear();
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("audio playback lifecycle", () => {
  it.each(["windmill", "hive"] as const)(
    "plays %s music and restores it after star power",
    (theme) => {
      const audio = new AudioPlayer();
      audio.unlock();
      audio.setMusic(theme, true);
      const initial = firstFrequency(context().oscillators[0]!);
      const afterTheme = context().oscillators.length;
      audio.setMusic(theme, true, true);
      expect(firstFrequency(context().oscillators[afterTheme]!)).not.toBe(
        initial,
      );
      const afterStar = context().oscillators.length;
      audio.setMusic(theme, true);
      expect(firstFrequency(context().oscillators[afterStar]!)).toBe(initial);
      expect(vi.getTimerCount()).toBe(1);
      audio.suspend();
    },
  );

  it("plays expansion cues gently, coalesces repeated pickups and respects mute and pause", () => {
    const audio = new AudioPlayer();
    audio.unlock();
    for (const event of [
      "feather",
      "feather-refill",
      "feather-empty",
      "portal",
      "mechanism",
      "hive-discovered",
      "secret-complete",
      "hoop",
      "soft-landing",
      "minigame-result",
    ]) {
      const before = context().oscillators.length;
      audio.play(event);
      expect(context().oscillators.length, event).toBeGreaterThan(before);
    }
    const beforeRepeat = context().oscillators.length;
    audio.play("hoop");
    expect(context().oscillators.length).toBe(beforeRepeat);
    vi.advanceTimersByTime(150);
    audio.play("hoop");
    expect(context().oscillators.length).toBeGreaterThan(beforeRepeat);
    audio.enabled = false;
    const muted = context().oscillators.length;
    audio.play("secret-complete");
    expect(context().oscillators.length).toBe(muted);
    audio.enabled = true;
    audio.suspend();
    audio.play("portal");
    expect(context().oscillators.length).toBe(muted);
  });
  it("waits for a gesture, then keeps only one music scheduler across frame updates", () => {
    const audio = new AudioPlayer();
    audio.setMusic("meadow", true);
    expect(FakeContext.instances).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
    audio.unlock();
    const firstNotes = context().oscillators.length;
    expect(firstNotes).toBeGreaterThan(0);
    for (let i = 0; i < 120; i++) audio.setMusic("meadow", true);
    expect(vi.getTimerCount()).toBe(1);
    expect(context().oscillators).toHaveLength(firstNotes);
    vi.advanceTimersByTime(1000);
    expect(context().oscillators.length).toBeGreaterThan(firstNotes);
    audio.suspend();
  });

  it("stops queued music immediately on pause while allowing a victory effect", () => {
    const audio = new AudioPlayer();
    audio.unlock();
    audio.setMusic("alpine", true);
    const voices = [...context().oscillators];
    audio.setMusic("alpine", false);
    expect(vi.getTimerCount()).toBe(0);
    expect(
      voices.every((voice) =>
        voice.stop.mock.calls.some((args) => args.length === 0),
      ),
    ).toBe(true);
    vi.advanceTimersByTime(2000);
    expect(context().oscillators).toHaveLength(voices.length);
    audio.play("win");
    expect(context().oscillators.length).toBe(voices.length + 4);
  });

  it("controls music and effects independently, including enabling music after a muted start", () => {
    const audio = new AudioPlayer();
    audio.enabled = false;
    audio.musicEnabled = false;
    audio.unlock();
    expect(FakeContext.instances).toHaveLength(0);
    audio.setMusic("dusk", true);
    audio.musicEnabled = true;
    audio.unlock();
    expect(vi.getTimerCount()).toBe(1);
    const notes = context().oscillators.length;
    audio.play("coin");
    expect(context().oscillators).toHaveLength(notes);
    audio.musicEnabled = false;
    expect(vi.getTimerCount()).toBe(0);
    audio.enabled = true;
    audio.play("coin");
    const effect = context().oscillators.slice(notes);
    expect(effect.map(firstFrequency)).toEqual([740, 1110]);
    audio.enabled = false;
    expect(
      effect.every((voice) =>
        voice.stop.mock.calls.some((args) => args.length === 0),
      ),
    ).toBe(true);
  });

  it("switches to star power music and returns to the world's score without stacking loops", () => {
    const audio = new AudioPlayer();
    audio.unlock();
    audio.setMusic("dusk", true);
    const duskFrequency = firstFrequency(context().oscillators[0]!);
    const oldVoices = [...context().oscillators];
    audio.setMusic("dusk", true, true);
    const starFrequency = firstFrequency(
      context().oscillators[oldVoices.length]!,
    );
    expect(starFrequency).not.toBe(duskFrequency);
    expect(
      oldVoices.every((voice) => voice.disconnect.mock.calls.length > 0),
    ).toBe(true);
    expect(vi.getTimerCount()).toBe(1);
    const afterStar = context().oscillators.length;
    audio.setMusic("dusk", true, false);
    expect(firstFrequency(context().oscillators[afterStar]!)).toBe(
      duskFrequency,
    );
    expect(vi.getTimerCount()).toBe(1);
    audio.suspend();
  });

  it("keeps one boss score through phase updates and restores it after star power", () => {
    const audio = new AudioPlayer();
    audio.unlock();
    audio.setMusic("meadow", true);
    const trail = [...context().oscillators];
    audio.setMusic("meadow", true, false, "boss");
    const bossFrequency = firstFrequency(context().oscillators[trail.length]!);
    expect(bossFrequency).not.toBe(firstFrequency(trail[0]!));
    expect(trail.every((voice) => voice.disconnect.mock.calls.length > 0)).toBe(
      true,
    );
    const bossNotes = context().oscillators.length;
    for (let i = 0; i < 120; i++) audio.setMusic("meadow", true, false, "boss");
    expect(context().oscillators).toHaveLength(bossNotes);
    expect(vi.getTimerCount()).toBe(1);
    audio.setMusic("meadow", true, true, "boss");
    expect(firstFrequency(context().oscillators[bossNotes]!)).not.toBe(
      bossFrequency,
    );
    const afterStar = context().oscillators.length;
    audio.setMusic("meadow", true, false, "boss");
    expect(firstFrequency(context().oscillators[afterStar]!)).toBe(
      bossFrequency,
    );
    expect(vi.getTimerCount()).toBe(1);
    audio.setMusic("meadow", false, false, "boss");
    expect(vi.getTimerCount()).toBe(0);
    expect(
      context().oscillators.every(
        (voice) => voice.disconnect.mock.calls.length,
      ),
    ).toBe(true);
    const stopped = context().oscillators.length;
    audio.play("boss-defeat");
    expect(context().oscillators.length).toBeGreaterThan(stopped);
  });

  it("switches to the quiet grove score and stops it on background interruption", async () => {
    const audio = new AudioPlayer();
    audio.unlock();
    audio.setMusic("meadow", true, false, "grove");
    expect(context().oscillators[0]!.type).toBe("sine");
    const initial = context().oscillators.length;
    audio.setMusic("meadow", true, false, "grove");
    expect(context().oscillators).toHaveLength(initial);
    audio.suspend();
    audio.play("awaken");
    audio.play("purchase");
    vi.advanceTimersByTime(10000);
    expect(context().oscillators).toHaveLength(initial);
    expect(vi.getTimerCount()).toBe(0);
    audio.unlock();
    await Promise.resolve();
    expect(vi.getTimerCount()).toBe(1);
    expect(context().oscillators[initial]!.type).toBe("sine");
    audio.suspend();
  });

  it("coalesces nearby plants without swallowing a boss warning or later wakeups", () => {
    const audio = new AudioPlayer();
    audio.unlock();
    audio.play("awaken");
    const onePlant = context().oscillators.length;
    expect(onePlant).toBeGreaterThan(0);
    for (let i = 0; i < 5; i++) audio.play("awaken");
    expect(context().oscillators).toHaveLength(onePlant);
    audio.play("boss-warning");
    const warning = context().oscillators.length;
    expect(warning).toBeGreaterThan(onePlant);
    expect(context().oscillators[0]!.type).toBe("sine");
    expect(context().oscillators[onePlant]!.type).toBe("triangle");
    audio.play("boss-warning");
    expect(context().oscillators).toHaveLength(warning);
    vi.advanceTimersByTime(200);
    audio.play("awaken");
    expect(context().oscillators.length).toBe(warning + onePlant);
    audio.enabled = false;
    const muted = context().oscillators.length;
    audio.play("boss-hit");
    audio.play("unlock");
    audio.play("purchase");
    expect(context().oscillators).toHaveLength(muted);
  });

  it("suspends all sound when interrupted and resumes only after another gesture", async () => {
    const audio = new AudioPlayer();
    audio.unlock();
    audio.setMusic("meadow", true);
    audio.play("grow");
    audio.suspend();
    const count = context().oscillators.length;
    expect(context().state).toBe("suspended");
    audio.setMusic("meadow", true);
    audio.play("coin");
    vi.advanceTimersByTime(5000);
    expect(context().oscillators).toHaveLength(count);
    expect(vi.getTimerCount()).toBe(0);
    audio.unlock();
    await Promise.resolve();
    expect(context().resume).toHaveBeenCalledTimes(1);
    expect(context().oscillators.length).toBeGreaterThan(count);
    expect(vi.getTimerCount()).toBe(1);
    audio.suspend();
  });

  it("coalesces a coin-room burst into one chime without muting later pickups", () => {
    const audio = new AudioPlayer();
    audio.unlock();
    for (let i = 0; i < 20; i++) audio.play("coin");
    expect(context().oscillators.map(firstFrequency)).toEqual([740, 1110]);
    vi.advanceTimersByTime(60);
    audio.play("coin");
    expect(context().oscillators.map(firstFrequency)).toEqual([
      740, 1110, 740, 1110,
    ]);
  });

  it("resumes Safari's interrupted context on a fresh gesture", async () => {
    const audio = new AudioPlayer();
    audio.unlock();
    context().state = "interrupted";
    audio.setMusic("dusk", true);
    expect(vi.getTimerCount()).toBe(0);
    audio.unlock();
    await Promise.resolve();
    expect(context().resume).toHaveBeenCalledTimes(1);
    expect(context().state).toBe("running");
    expect(vi.getTimerCount()).toBe(1);
    audio.suspend();
  });

  it("recreates a closed context and retires its old scheduler and voices", () => {
    const audio = new AudioPlayer();
    audio.unlock();
    audio.setMusic("alpine", true);
    audio.play("coin");
    const oldContext = context();
    oldContext.state = "closed";
    audio.unlock();
    expect(FakeContext.instances).toHaveLength(2);
    expect(context()).not.toBe(oldContext);
    expect(vi.getTimerCount()).toBe(1);
    expect(
      oldContext.oscillators.every(
        (voice) => voice.disconnect.mock.calls.length > 0,
      ),
    ).toBe(true);
    const count = context().oscillators.length;
    audio.play("coin");
    expect(context().oscillators).toHaveLength(count + 2);
    audio.suspend();
  });

  it("continues the game when audio is unavailable or a resume is rejected", async () => {
    vi.stubGlobal(
      "AudioContext",
      class {
        constructor() {
          throw new Error("Unavailable");
        }
      },
    );
    const missing = new AudioPlayer();
    expect(() => missing.unlock()).not.toThrow();
    expect(() => missing.play("grow")).not.toThrow();
    vi.stubGlobal("AudioContext", FakeContext);
    const audio = new AudioPlayer();
    audio.unlock();
    context().state = "suspended";
    context().resume.mockRejectedValueOnce(new Error("Gesture required"));
    audio.setMusic("alpine", true);
    audio.unlock();
    await Promise.resolve();
    await Promise.resolve();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("optional native haptics", () => {
  it("reserves tactile cues for player interactions and celebrations", () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    const audio = new AudioPlayer();
    audio.enabled = false;
    audio.musicEnabled = false;
    audio.play("boss-warning");
    audio.play("hopper-bounce");
    audio.play("enemy-break");
    expect(Haptics.impact).not.toHaveBeenCalled();
    audio.play("awaken");
    expect(Haptics.impact).toHaveBeenLastCalledWith({ style: "LIGHT" });
    vi.advanceTimersByTime(150);
    audio.play("boss-hit");
    expect(Haptics.impact).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(150);
    audio.play("boss-defeat");
    expect(Haptics.notification).toHaveBeenCalledTimes(1);
    audio.suspend();
    vi.advanceTimersByTime(150);
    audio.play("purchase");
    expect(Haptics.notification).toHaveBeenCalledTimes(1);
  });

  it("doesn't invoke native haptics on the web or for ordinary coins", () => {
    const audio = new AudioPlayer();
    audio.play("stomp");
    expect(Haptics.impact).not.toHaveBeenCalled();
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    audio.play("coin");
    expect(Haptics.impact).not.toHaveBeenCalled();
    expect(Haptics.notification).not.toHaveBeenCalled();
  });

  it("provides subtle feedback independently of sound and throttles same-frame impacts", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    const audio = new AudioPlayer();
    audio.enabled = false;
    audio.musicEnabled = false;
    audio.play("stomp");
    audio.play("stomp");
    audio.play("life-lost");
    expect(Haptics.impact).toHaveBeenCalledTimes(1);
    expect(Haptics.impact).toHaveBeenCalledWith({ style: "LIGHT" });
    vi.advanceTimersByTime(150);
    audio.play("shrink");
    expect(Haptics.impact).toHaveBeenLastCalledWith({ style: "MEDIUM" });
    vi.advanceTimersByTime(150);
    vi.mocked(Haptics.notification).mockRejectedValueOnce(
      new Error("Unsupported"),
    );
    audio.play("firefly");
    await Promise.resolve();
    expect(Haptics.notification).toHaveBeenCalledWith({ type: "SUCCESS" });
    audio.hapticsEnabled = false;
    vi.advanceTimersByTime(150);
    audio.play("stomp");
    expect(Haptics.impact).toHaveBeenCalledTimes(2);
  });
});
