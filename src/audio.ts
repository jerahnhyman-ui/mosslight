/** Small, original synthesized effects; no downloads or background audio. */
export class AudioPlayer {
  enabled = true;
  private context?: AudioContext;
  unlock() {
    if (!this.enabled) return;
    this.context ??= new AudioContext();
    if (this.context.state === "suspended") void this.context.resume();
  }
  play(event: string) {
    if (!this.enabled || !this.context) return;
    const patterns: Record<string, number[]> = {
      jump: [300, 470],
      coin: [740, 1110],
      star: [660, 830, 990, 1320],
      hurt: [200, 150, 95],
      stomp: [180, 400],
      checkpoint: [520, 660, 780],
      win: [523, 659, 784, 1047],
      lose: [300, 240, 160],
    };
    const notes = patterns[event];
    if (!notes) return;
    notes.forEach((frequency, index) => {
      const oscillator = this.context!.createOscillator();
      const gain = this.context!.createGain();
      const at = this.context!.currentTime + index * 0.07;
      oscillator.type = event === "hurt" ? "sawtooth" : "triangle";
      oscillator.frequency.setValueAtTime(frequency, at);
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(0.07, at + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, at + 0.13);
      oscillator.connect(gain);
      gain.connect(this.context!.destination);
      oscillator.start(at);
      oscillator.stop(at + 0.14);
    });
  }
}
