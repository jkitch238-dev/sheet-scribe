import { uid } from "@/lib/utils";
import type { Accidental, Pitch } from "./pitch";
import { keyAccidentalForLetter, pitchToMidi } from "./pitch";

export type Duration = 1 | 2 | 4 | 8 | 16 | 32;

export type Instrument = "violin" | "guitar" | "piano";

export type ThemeId = "parchment" | "manuscript" | "vellum" | "night";

export interface TimeSig {
  beats: number;
  beatType: 2 | 4 | 8;
}

export interface Note {
  id: string;
  kind: "note" | "rest";
  pitch: Pitch;
  duration: Duration;
  dotted: boolean;
  accidental: Accidental | null;
  staccato?: boolean;
}

export interface Measure {
  id: string;
  notes: Note[];
}

export interface Score {
  id: string;
  title: string;
  composer: string;
  instrument: Instrument;
  fifths: number;
  time: TimeSig;
  tempo: number;
  measures: Measure[];
  updatedAt: number;
}

export const DURATION_LABEL: Record<Duration, string> = {
  1: "Whole",
  2: "Half",
  4: "Quarter",
  8: "Eighth",
  16: "Sixteenth",
  32: "32nd",
};

export function durationUnits(duration: Duration, dotted: boolean): number {
  const base = 16 / duration;
  return dotted ? base * 1.5 : base;
}

export function measureCapacity(time: TimeSig): number {
  return time.beats * (16 / time.beatType);
}

export function measureFill(measure: Measure): number {
  return measure.notes.reduce((sum, n) => sum + durationUnits(n.duration, n.dotted), 0);
}

export function emptyMeasure(): Measure {
  return { id: uid("m"), notes: [] };
}

export function makeNote(partial: Partial<Note> & Pick<Note, "pitch" | "duration">): Note {
  return {
    id: uid("n"),
    kind: "note",
    dotted: false,
    accidental: null,
    ...partial,
  };
}

export function makeRest(duration: Duration, dotted = false): Note {
  return {
    id: uid("r"),
    kind: "rest",
    pitch: { letter: "B", octave: 4, accidental: 0 },
    duration,
    dotted,
    accidental: null,
  };
}

export function emptyScore(over: Partial<Score> = {}): Score {
  return {
    id: uid("score"),
    title: "Untitled",
    composer: "",
    instrument: "violin",
    fifths: 0,
    time: { beats: 4, beatType: 4 },
    tempo: 96,
    measures: Array.from({ length: 8 }, () => emptyMeasure()),
    updatedAt: Date.now(),
    ...over,
  };
}

export function cloneScore(score: Score): Score {
  return structuredClone(score);
}

export function noteMidi(note: Note, fifths: number): number {
  if (note.kind === "rest") return 0;
  const acc: Accidental =
    note.accidental !== null ? note.accidental : keyAccidentalForLetter(fifths, note.pitch.letter);
  return pitchToMidi({ ...note.pitch, accidental: acc });
}

export function ensureTrailingEmpty(score: Score): Score {
  const last = score.measures[score.measures.length - 1];
  if (!last || last.notes.length > 0) {
    return { ...score, measures: [...score.measures, emptyMeasure()], updatedAt: Date.now() };
  }
  return score;
}
