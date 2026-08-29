/**
 * Scan feedback helpers — shared by POS camera scanner and barcode dialogs.
 * Uses WebAudio (no asset files) so the beep plays instantly (< 10ms latency).
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!audioCtx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) return null;
      audioCtx = new Ctor();
    }
    // Autoplay policy: resume if suspended (e.g. after tab switch)
    if (audioCtx.state === "suspended") void audioCtx.resume();
    return audioCtx;
  } catch {
    return null;
  }
}

/**
 * Short two-tone "success" beep, like a real POS terminal.
 * Safe to call anywhere — silently no-ops if audio is unavailable.
 */
export function playScanBeep(success = true) {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);

    // Success: quick rising two-tone (880Hz → 1320Hz).
    // Error: single low buzz (320Hz).
    const freqs = success ? [880, 1320] : [320];
    const step = 0.09;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.22, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + step * freqs.length + 0.02);

    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = "square";
      osc.frequency.setValueAtTime(freq, now + i * step);
      osc.connect(gain);
      osc.start(now + i * step);
      osc.stop(now + (i + 1) * step);
    });
  } catch {
    // Ignore audio failures — never block the scan flow.
  }
}

/** Haptic feedback on supported mobile devices. */
export function vibrateScan(success = true) {
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  try {
    navigator.vibrate(success ? 80 : [60, 40, 60]);
  } catch {
    // ignore
  }
}
