import { midiToHz } from "./pitch";
import type { Instrument, Note, Score } from "./score";
import { durationUnits, noteMidi } from "./score";

export interface PlayEvent {
  note: Note;
  measureIndex: number;
  noteIndex: number;
  start: number;
  duration: number;
  midi: number;
}

let ctx: AudioContext | null = null;
let playing = false;
let timers: number[] = [];

function audio(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

export function isPlaying(): boolean {
  return playing;
}

export function stopPlayback(): void {
  playing = false;
  for (const t of timers) window.clearTimeout(t);
  timers = [];
  if (ctx && ctx.state !== "closed") {
    void ctx.close();
    ctx = null;
  }
}

function unitSeconds(score: Score): number {
  return 60 / score.tempo / 4;
}

export function buildEvents(score: Score, fromMeasure = 0, onlyMeasure = false): PlayEvent[] {
  const unit = unitSeconds(score);
  const events: PlayEvent[] = [];
  let t = 0;
  const last = onlyMeasure ? fromMeasure + 1 : score.measures.length;
  for (let mi = fromMeasure; mi < last; mi++) {
    const m = score.measures[mi];
    if (!m) break;
    for (let ni = 0; ni < m.notes.length; ni++) {
      const note = m.notes[ni];
      const dur = durationUnits(note.duration, note.dotted) * unit;
      events.push({
        note,
        measureIndex: mi,
        noteIndex: ni,
        start: t,
        duration: Math.max(0.05, dur),
        midi: note.kind === "note" ? noteMidi(note, score.fifths) : 0,
      });
      t += dur;
    }
  }
  return events;
}

function voice(ac: AudioContext, inst: Instrument, midi: number, when: number, dur: number, staccato?: boolean) {
  const hz = midiToHz(midi);
  const hold = staccato ? dur * 0.42 : dur * 0.9;
  const master = ac.createGain();
  master.gain.setValueAtTime(0, when);
  master.gain.linearRampToValueAtTime(0.18, when + 0.018);
  master.gain.exponentialRampToValueAtTime(0.0001, when + hold);
  master.connect(ac.destination);

  if (inst === "piano") {
    const osc = ac.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = hz;
    const osc2 = ac.createOscillator();
    osc2.type = "sine";
    osc2.frequency.value = hz * 2;
    const g2 = ac.createGain();
    g2.gain.value = 0.12;
    osc.connect(master);
    osc2.connect(g2).connect(master);
    osc.start(when);
    osc2.start(when);
    osc.stop(when + hold + 0.02);
    osc2.stop(when + hold + 0.02);
    return;
  }

  if (inst === "guitar") {
    const osc = ac.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = hz;
    const filter = ac.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1200;
    osc.connect(filter).connect(master);
    osc.start(when);
    osc.stop(when + hold + 0.02);
    return;
  }

  const osc = ac.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.value = hz;
  const filter = ac.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = hz * 2.2;
  filter.Q.value = 4;
  const bright = ac.createBiquadFilter();
  bright.type = "lowpass";
  bright.frequency.value = 2800;
  osc.connect(filter).connect(bright).connect(master);
  osc.start(when);
  osc.stop(when + hold + 0.03);
}

export async function playScore(
  score: Score,
  opts: {
    fromMeasure?: number;
    onlyMeasure?: boolean;
    onEvent?: (ev: PlayEvent | null) => void;
    onDone?: () => void;
  } = {},
): Promise<void> {
  stopPlayback();
  const ac = audio();
  await ac.resume();
  playing = true;
  const events = buildEvents(score, opts.fromMeasure ?? 0, opts.onlyMeasure ?? false);
  const t0 = ac.currentTime + 0.05;
  for (const ev of events) {
    if (ev.note.kind === "note") {
      voice(ac, score.instrument, ev.midi, t0 + ev.start, ev.duration, ev.note.staccato);
    }
    const id = window.setTimeout(() => {
      if (playing) opts.onEvent?.(ev);
    }, (ev.start + 0.05) * 1000);
    timers.push(id);
  }
  const total = events.reduce((m, e) => Math.max(m, e.start + e.duration), 0.2);
  const done = window.setTimeout(() => {
    playing = false;
    opts.onEvent?.(null);
    opts.onDone?.();
  }, (total + 0.15) * 1000);
  timers.push(done);
}
