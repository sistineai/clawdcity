// SHELL-5: short synthesised sounds (no audio files) and haptics. Audio stays muted until the
// first user gesture, and whenever the setting is off.
type Kind = 'found' | 'miss' | 'resident' | 'finish';
let ac: AudioContext | null = null;
let unlocked = false;

export function unlockAudio(): void {
  unlocked = true;
}
if (typeof window !== 'undefined') {
  for (const ev of ['pointerdown', 'keydown'] as const)
    window.addEventListener(ev, unlockAudio, { once: true, passive: true });
}

function ctx(): AudioContext | null {
  if (!unlocked) return null;
  try {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ac ??= new AC();
    // resume() rejects if the page navigates away while it is pending (Firefox); that is harmless
    if (ac.state === 'suspended') ac.resume().catch(() => {});
    return ac;
  } catch {
    return null;
  }
}

function tone(a: AudioContext, freq: number, start: number, dur: number, type: OscillatorType, gain: number) {
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, a.currentTime + start);
  g.gain.setValueAtTime(0.0001, a.currentTime + start);
  g.gain.exponentialRampToValueAtTime(gain, a.currentTime + start + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + start + dur);
  o.connect(g).connect(a.destination);
  o.start(a.currentTime + start);
  o.stop(a.currentTime + start + dur + 0.02);
}

export function playSound(kind: Kind, enabled: boolean): void {
  if (!enabled) return;
  const a = ctx();
  if (!a) return;
  try {
    if (kind === 'found') {
      tone(a, 660, 0, 0.12, 'triangle', 0.18);
      tone(a, 990, 0.07, 0.16, 'triangle', 0.14);
    } else if (kind === 'miss') tone(a, 180, 0, 0.12, 'sine', 0.12);
    else if (kind === 'resident')
      [523, 659, 784, 1047].forEach((f, i) => tone(a, f, i * 0.08, 0.22, 'triangle', 0.14));
    else [392, 523, 659, 784, 1047].forEach((f, i) => tone(a, f, i * 0.1, 0.35, 'sine', 0.13));
  } catch {
    // sound is decoration
  }
}

export function buzz(pattern: number | number[], enabled: boolean): void {
  if (!enabled) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // unsupported
  }
}
