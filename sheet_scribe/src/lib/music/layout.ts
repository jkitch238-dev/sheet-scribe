import {
  FLAT_STAFF_STEPS,
  SHARP_STAFF_STEPS,
  pitchToStaffSteps,
} from "./pitch";
import type { Duration, Measure, Note, Score } from "./score";
import { durationUnits, measureCapacity } from "./score";

export const STAFF_GAP = 12;
export const STAFF_HEIGHT = STAFF_GAP * 4;
export const LEFT_PAD = 28;
export const CLEF_W = 42;
export const TIME_W = 28;
export const NOTE_MIN_GAP = 22;
export const SYSTEM_GAP = 92;
export const TOP_PAD = 28;
export const BOTTOM_PAD = 56;

export interface LaidNote {
  note: Note;
  measureIndex: number;
  noteIndex: number;
  x: number;
  y: number;
  staffSteps: number;
  stemUp: boolean;
  units: number;
}

export interface LaidMeasure {
  index: number;
  x: number;
  width: number;
  notes: LaidNote[];
  fill: number;
  capacity: number;
}

export interface LaidSystem {
  index: number;
  y: number;
  x: number;
  width: number;
  measures: LaidMeasure[];
  showClef: boolean;
  showKey: boolean;
  showTime: boolean;
}

export interface ScoreLayout {
  width: number;
  height: number;
  systems: LaidSystem[];
  notes: LaidNote[];
  staffTopInSystem: number;
  keyWidth: number;
}

export function staffY(staffTop: number, steps: number): number {
  return staffTop + STAFF_HEIGHT - steps * (STAFF_GAP / 2);
}

export function keySigWidth(fifths: number): number {
  return Math.abs(fifths) * 12 + (fifths === 0 ? 0 : 6);
}

export function preludeWidth(fifths: number, showTime: boolean): number {
  return LEFT_PAD + CLEF_W + keySigWidth(fifths) + (showTime ? TIME_W : 0) + 8;
}

export function layoutScore(score: Score, pageWidth: number): ScoreLayout {
  const width = Math.max(320, pageWidth);
  const keyW = keySigWidth(score.fifths);
  const cap = measureCapacity(score.time);
  const systems: LaidSystem[] = [];
  const allNotes: LaidNote[] = [];

  const staffTop = 18;
  let sysIndex = 0;
  let cursorX = 0;
  let current: LaidMeasure[] = [];

  const startX = (first: boolean) => preludeWidth(score.fifths, first);

  const flush = (isLastChunk: boolean) => {
    if (!current.length) return;
    const y = TOP_PAD + sysIndex * (STAFF_HEIGHT + SYSTEM_GAP);
    const showClef = true;
    const showTime = sysIndex === 0;
    const sys: LaidSystem = {
      index: sysIndex,
      y,
      x: 0,
      width,
      measures: current,
      showClef,
      showKey: true,
      showTime,
    };
    systems.push(sys);
    sysIndex += 1;
    current = [];
    cursorX = 0;
    void isLastChunk;
  };

  score.measures.forEach((measure, mi) => {
    const laid = layoutMeasure(measure, mi, score, cap);
    const firstOfSystem = current.length === 0;
    const needed = laid.width + 8;
    const usable = width - startX(systems.length === 0 && firstOfSystem) - 16;
    if (current.length && cursorX + needed > usable) {
      flush(false);
    }
    const sx = startX(systems.length === 0 && current.length === 0);
    if (current.length === 0) cursorX = 0;
    laid.x = sx + cursorX;
    cursorX += laid.width;
    current.push(laid);
  });
  flush(true);

  for (const sys of systems) {
    const last = sys.measures[sys.measures.length - 1];
    if (last) {
      const stretchTo = width - 16;
      const extra = stretchTo - (last.x + last.width);
      if (extra > 8 && sys.measures.length > 0) {
        const each = extra / sys.measures.length;
        sys.measures.forEach((m, i) => {
          m.x += each * i;
          m.width += each;
        });
      }
    }
    for (const m of sys.measures) {
      const inner = m.notes;
      if (inner.length === 0) continue;
      const contentW = m.width - 16;
      const totalUnits = inner.reduce((s, n) => s + n.units, 0) || 1;
      let x = m.x + 14;
      for (const n of inner) {
        const slot = (n.units / totalUnits) * contentW;
        n.x = x + Math.max(10, slot * 0.42);
        n.y = staffY(sys.y + staffTop, n.staffSteps);
        x += slot;
        allNotes.push(n);
      }
    }
  }

  const height =
    (systems.length ? systems[systems.length - 1].y : TOP_PAD) + STAFF_HEIGHT + BOTTOM_PAD + 24;

  return { width, height, systems, notes: allNotes, staffTopInSystem: staffTop, keyWidth: keyW };
}

function layoutMeasure(measure: Measure, index: number, score: Score, cap: number): LaidMeasure {
  const notes: LaidNote[] = measure.notes.map((note, noteIndex) => {
    const steps = note.kind === "rest" ? 2 : pitchToStaffSteps(note.pitch);
    const units = durationUnits(note.duration, note.dotted);
    return {
      note,
      measureIndex: index,
      noteIndex,
      x: 0,
      y: 0,
      staffSteps: steps,
      stemUp: steps < 4,
      units,
    };
  });
  const fill = notes.reduce((s, n) => s + n.units, 0);
  const minW = Math.max(72, 28 + notes.length * NOTE_MIN_GAP);
  return { index, x: 0, width: minW, notes, fill, capacity: cap };
}

export function accidentalStaffSteps(fifths: number): number[] {
  if (fifths > 0) return SHARP_STAFF_STEPS.slice(0, fifths);
  if (fifths < 0) return FLAT_STAFF_STEPS.slice(0, -fifths);
  return [];
}

export function durationHasStem(d: Duration): boolean {
  return d !== 1;
}

export function durationFlags(d: Duration): number {
  if (d === 8) return 1;
  if (d === 16) return 2;
  if (d === 32) return 3;
  return 0;
}

export function isOpenHead(d: Duration): boolean {
  return d === 1 || d === 2;
}
