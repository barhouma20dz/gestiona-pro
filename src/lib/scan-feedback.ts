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

/**
 * Realistic cash register chime sound effect (WebAudio).
 * Plays a mechanical latch snap followed by a resonant metallic bell chime.
 */
export function playCashDrawerSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // 1. Mechanical latch click
    const clickGain = ctx.createGain();
    clickGain.connect(ctx.destination);
    clickGain.gain.setValueAtTime(0.28, now);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

    const clickOsc = ctx.createOscillator();
    clickOsc.type = "triangle";
    clickOsc.frequency.setValueAtTime(160, now);
    clickOsc.frequency.exponentialRampToValueAtTime(40, now + 0.04);
    clickOsc.connect(clickGain);
    clickOsc.start(now);
    clickOsc.stop(now + 0.04);

    // 2. Resonant high bell chime (harmonics at 1760Hz, 2640Hz, 3520Hz)
    const bellGain = ctx.createGain();
    bellGain.connect(ctx.destination);
    bellGain.gain.setValueAtTime(0.001, now + 0.02);
    bellGain.gain.linearRampToValueAtTime(0.3, now + 0.035);
    bellGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);

    [1760, 2640, 3520].forEach((freq) => {
      const bellOsc = ctx.createOscillator();
      bellOsc.type = "sine";
      bellOsc.frequency.setValueAtTime(freq, now + 0.02);
      bellOsc.connect(bellGain);
      bellOsc.start(now + 0.02);
      bellOsc.stop(now + 0.65);
    });
  } catch {
    // Ignore audio failures
  }
}

/**
 * Hardware Cash Drawer Kick via standard ESC/POS command:
 * ESC p 0 25 250 -> [0x1B, 0x70, 0x00, 0x19, 0xFA]
 * Automatically plays register audio chime and triggers haptics.
 */
export async function triggerCashDrawerKick() {
  playCashDrawerSound();
  vibrateScan(true);

  if (typeof navigator !== "undefined" && "serial" in navigator) {
    try {
      const serial = (navigator as unknown as { serial?: { getPorts: () => Promise<any[]> } }).serial;
      if (serial) {
        const ports = await serial.getPorts();
        if (ports && ports.length > 0) {
          const port = ports[0];
          await port.open({ baudRate: 9600 });
          const writer = port.writable.getWriter();
          const escPosKick = new Uint8Array([0x1b, 0x70, 0x00, 0x19, 0xfa]);
          await writer.write(escPosKick);
          writer.releaseLock();
          await port.close();
        }
      }
    } catch {
      // Serial not connected or permission not granted
    }
  }
}
