import { snapMidiToPitch, hzToMidi } from "./pitch";
import type { Duration, Note, TimeSig } from "./score";
import { durationUnits, makeNote, makeRest, measureCapacity } from "./score";

function autoCorrelate(buf: Float32Array, sampleRate: number): number | null {
  const SIZE = buf.length;
  const rms = Math.sqrt(buf.reduce((s, v) => s + v * v, 0) / SIZE);
  if (rms < 0.01) return null;
  let r1 = 0;
  let r2 = SIZE - 1;
  const thres = 0.2;
  for (let i = 0; i < SIZE / 2; i++) {
    if (Math.abs(buf[i]) < thres) {
      r1 = i;
      break;
    }
  }
  for (let i = 1; i < SIZE / 2; i++) {
    if (Math.abs(buf[SIZE - i]) < thres) {
      r2 = SIZE - i;
      break;
    }
  }
  const slice = buf.slice(r1, r2);
  const n = slice.length;
  const c = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = 0; j < n - i; j++) sum += slice[j] * slice[j + i];
    c[i] = sum;
  }
  let d = 0;
  while (c[d] > c[d + 1]) d++;
  let maxval = -1;
  let maxpos = -1;
  for (let i = d; i < n; i++) {
    if (c[i] > maxval) {
      maxval = c[i];
      maxpos = i;
    }
  }
  let T0 = maxpos;
  const x1 = c[T0 - 1] ?? 0;
  const x2 = c[T0] ?? 0;
  const x3 = c[T0 + 1] ?? 0;
  const a = (x1 + x3 - 2 * x2) / 2;
  const b = (x3 - x1) / 2;
  if (a) T0 = T0 - b / (2 * a);
  const hz = sampleRate / T0;
  if (hz < 70 || hz > 1800) return null;
  return hz;
}

function nearestDuration(units: number): { duration: Duration; dotted: boolean } {
  const candidates: { duration: Duration; dotted: boolean; u: number }[] = [
    { duration: 1, dotted: false, u: 16 },
    { duration: 2, dotted: true, u: 12 },
    { duration: 2, dotted: false, u: 8 },
    { duration: 4, dotted: true, u: 6 },
    { duration: 4, dotted: false, u: 4 },
    { duration: 8, dotted: true, u: 3 },
    { duration: 8, dotted: false, u: 2 },
    { duration: 16, dotted: false, u: 1 },
  ];
  let best = candidates[4];
  let err = Infinity;
  for (const c of candidates) {
    const e = Math.abs(c.u - units);
    if (e < err) {
      err = e;
      best = c;
    }
  }
  return { duration: best.duration, dotted: best.dotted };
}

export interface TranscribeOptions {
  tempo: number;
  time: TimeSig;
  fifths: number;
}

export function transcribeBuffer(buffer: AudioBuffer, opts: TranscribeOptions): Note[] {
  const ch = buffer.getChannelData(0);
  const sr = buffer.sampleRate;
  const hop = Math.floor(sr * 0.04);
  const win = Math.floor(sr * 0.08);
  const frames: { t: number; hz: number | null; energy: number }[] = [];
  for (let i = 0; i + win < ch.length; i += hop) {
    const slice = ch.slice(i, i + win);
    let energy = 0;
    for (let j = 0; j < slice.length; j++) energy += slice[j] * slice[j];
    energy = Math.sqrt(energy / slice.length);
    const hz = energy > 0.02 ? autoCorrelate(slice, sr) : null;
    frames.push({ t: i / sr, hz, energy });
  }

  const notes: Note[] = [];
  let i = 0;
  const unitSec = 60 / opts.tempo / 4;
  while (i < frames.length) {
    const f = frames[i];
    if (!f.hz) {
      let j = i;
      while (j < frames.length && !frames[j].hz) j++;
      const restSec = (j - i) * (hop / sr);
      const units = restSec / unitSec;
      if (units >= 1.4) {
        const d = nearestDuration(Math.min(units, measureCapacity(opts.time)));
        notes.push(makeRest(d.duration, d.dotted));
      }
      i = j;
      continue;
    }
    const hzList: number[] = [];
    let j = i;
    while (j < frames.length && frames[j].hz) {
      hzList.push(frames[j].hz as number);
      j++;
    }
    const median = hzList.sort((a, b) => a - b)[Math.floor(hzList.length / 2)];
    const midi = hzToMidi(median);
    const pitch = snapMidiToPitch(midi, opts.fifths);
    const sec = (j - i) * (hop / sr);
    const units = Math.max(1, sec / unitSec);
    const d = nearestDuration(units);
    notes.push(
      makeNote({
        pitch,
        duration: d.duration,
        dotted: d.dotted,
        accidental: pitch.accidental === 0 ? null : pitch.accidental,
      }),
    );
    i = j;
  }

  // Drop tiny leading rest
  while (notes[0]?.kind === "rest" && durationUnits(notes[0].duration, notes[0].dotted) <= 2) {
    notes.shift();
  }
  return notes;
}

export async function decodeFile(file: File): Promise<AudioBuffer> {
  const ctx = new AudioContext();
  const arr = await file.arrayBuffer();
  const buf = await ctx.decodeAudioData(arr.slice(0));
  await ctx.close();
  return buf;
}
