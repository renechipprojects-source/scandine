// Web Audio API & HTML5 Audio based notification sound synthesizer with Autoplay Unlock & Deduplication
// Guarantees reliable playback without missing asset files or CORS/network issues.

const playedSoundNotificationIds = new Set<string>();

class SoundManager {
  private audioCtx: AudioContext | null = null;
  private isMuted: boolean = false;
  private unlocked: boolean = false;

  constructor() {
    if (typeof window !== "undefined") {
      const unlock = () => {
        this.unlocked = true;
        this.enableAudio();
        window.removeEventListener("click", unlock);
        window.removeEventListener("touchstart", unlock);
        window.removeEventListener("keydown", unlock);
        window.removeEventListener("pointerdown", unlock);
      };
      window.addEventListener("click", unlock, { once: true });
      window.addEventListener("touchstart", unlock, { once: true });
      window.addEventListener("keydown", unlock, { once: true });
      window.addEventListener("pointerdown", unlock, { once: true });
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === "undefined" || !this.unlocked) return null;
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.audioCtx = new AudioCtx();
      }
    }
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  public enableAudio(): void {
    if (!this.unlocked) return;
    const ctx = this.getAudioContext();
    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  private playAudioFile(): boolean {
    if (!this.unlocked) return false;
    try {
      const audio = new Audio("/notification.wav");
      audio.volume = 0.7;
      const promise = audio.play();
      if (promise !== undefined) {
        promise.catch((err) => {
          console.warn("Audio file autoplay prevented:", err);
        });
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Order Notification Sound (High bright chime: C5 -> E5 -> G5)
   */
  public playOrderSound(notificationId?: string): void {
    if (this.isMuted || !this.unlocked) return;
    if (notificationId) {
      if (playedSoundNotificationIds.has(notificationId)) return;
      playedSoundNotificationIds.add(notificationId);
    }

    this.playAudioFile();

    try {
      const ctx = this.getAudioContext();
      if (!ctx || ctx.state !== "running") return;

      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5

      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + index * 0.12);

        gain.gain.setValueAtTime(0.01, now + index * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.3, now + index * 0.12 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.12 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + index * 0.12);
        osc.stop(now + index * 0.12 + 0.38);
      });
    } catch (err) {
      console.warn("Error playing order sound:", err);
    }
  }

  /**
   * Service Request Sound (Soft double ding: A5 -> F#5)
   */
  public playServiceSound(notificationId?: string): void {
    if (this.isMuted || !this.unlocked) return;
    if (notificationId) {
      if (playedSoundNotificationIds.has(notificationId)) return;
      playedSoundNotificationIds.add(notificationId);
    }

    this.playAudioFile();

    try {
      const ctx = this.getAudioContext();
      if (!ctx || ctx.state !== "running") return;

      const now = ctx.currentTime;
      const tones = [
        { freq: 880, delay: 0 },    // A5
        { freq: 740, delay: 0.18 },  // F#5
      ];

      tones.forEach(({ freq, delay }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + delay);

        gain.gain.setValueAtTime(0.01, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.25, now + delay + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + delay);
        osc.stop(now + delay + 0.42);
      });
    } catch (err) {
      console.warn("Error playing service sound:", err);
    }
  }
}

export const soundManager = new SoundManager();

export function playOrderNotificationSound(id?: string) {
  soundManager.playOrderSound(id);
}

export function playServiceNotificationSound(id?: string) {
  soundManager.playServiceSound(id);
}
