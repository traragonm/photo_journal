/**
 * Generates assets/sounds/shutter.wav — a short mechanical shutter "ka-chick".
 * Pure procedural synthesis (no samples, no dependencies), deterministic output.
 *
 *   node scripts/generate-shutter-sound.js
 *
 * Shape: first curtain (sharp click + filtered noise + low body thunk),
 * then a softer second curtain ~55ms later, all under fast exponential decays.
 * Output: 16-bit PCM, mono, 44.1kHz, ~150ms.
 */
const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 44100;
const DURATION_S = 0.15;
const PEAK = 0.72; // normalized peak amplitude (headroom, never harsh)
const FADE_OUT_S = 0.012;
const SEED = 0x5eed;

/** One shutter-curtain event. */
const EVENTS = [
  { at: 0.0, gain: 1.0, clickDecay: 0.0012, noiseDecay: 0.018, bodyHz: 190, bodyDecay: 0.022 },
  { at: 0.055, gain: 0.62, clickDecay: 0.001, noiseDecay: 0.014, bodyHz: 240, bodyDecay: 0.016 },
];

// Small deterministic PRNG (mulberry32) so the asset is reproducible.
function createRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function synthesize() {
  const random = createRandom(SEED);
  const length = Math.round(SAMPLE_RATE * DURATION_S);
  const out = new Float64Array(length);

  for (const event of EVENTS) {
    const start = Math.round(event.at * SAMPLE_RATE);
    // One-pole high-pass on noise -> brighter, more "metal" than plain white noise.
    let previousNoise = 0;
    let previousHighPassed = 0;
    for (let i = start; i < length; i++) {
      const t = (i - start) / SAMPLE_RATE;
      const white = random() * 2 - 1;
      const highPassed = 0.86 * (previousHighPassed + white - previousNoise);
      previousNoise = white;
      previousHighPassed = highPassed;

      const click = (i === start ? 1 : 0) + Math.exp(-t / event.clickDecay) * (random() * 2 - 1) * 0.9;
      const noise = highPassed * Math.exp(-t / event.noiseDecay) * 0.55;
      const body = Math.sin(2 * Math.PI * event.bodyHz * t) * Math.exp(-t / event.bodyDecay) * 0.5;
      out[i] += event.gain * (click + noise + body);
    }
  }

  // Normalize + fade out the tail to avoid a click at the end.
  let max = 0;
  for (const value of out) max = Math.max(max, Math.abs(value));
  const scale = max > 0 ? PEAK / max : 0;
  const fadeSamples = Math.round(FADE_OUT_S * SAMPLE_RATE);
  for (let i = 0; i < length; i++) {
    const remaining = length - i;
    const fade = remaining < fadeSamples ? remaining / fadeSamples : 1;
    out[i] *= scale * fade;
  }
  return out;
}

function encodeWav(samples) {
  const bytesPerSample = 2;
  const dataSize = samples.length * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0, 'ascii');
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8, 'ascii');
  buffer.write('fmt ', 12, 'ascii');
  buffer.writeUInt32LE(16, 16); // PCM chunk size
  buffer.writeUInt16LE(1, 20); // PCM format
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * bytesPerSample, 28); // byte rate
  buffer.writeUInt16LE(bytesPerSample, 32); // block align
  buffer.writeUInt16LE(16, 34); // bits per sample
  buffer.write('data', 36, 'ascii');
  buffer.writeUInt32LE(dataSize, 40);
  samples.forEach((value, index) => {
    const clamped = Math.max(-1, Math.min(1, value));
    buffer.writeInt16LE(Math.round(clamped * 0x7fff), 44 + index * bytesPerSample);
  });
  return buffer;
}

const target = path.join(__dirname, '..', 'assets', 'sounds', 'shutter.wav');
fs.mkdirSync(path.dirname(target), { recursive: true });
const wav = encodeWav(synthesize());
fs.writeFileSync(target, wav);
console.log(`Wrote ${target} (${wav.length} bytes)`);
