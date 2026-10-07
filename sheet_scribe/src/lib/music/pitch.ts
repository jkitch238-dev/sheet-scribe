export type Letter = "C" | "D" | "E" | "F" | "G" | "A" | "B";

export const LETTERS: Letter[] = ["C", "D", "E", "F", "G", "A", "B"];

export type Accidental = -2 | -1 | 0 | 1 | 2;

export interface Pitch {
  letter: Letter;
  octave: number;
  accidental: Accidental;
}

const LETTER_SEMITONE: Record<Letter, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

export function pitchToMidi(p: Pitch): number {
  return (p.octave + 1) * 12 + LETTER_SEMITONE[p.letter] + p.accidental;
}

export function midiToHz(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

export function hzToMidi(hz: number): number {
  return 69 + 12 * Math.log2(hz / 440);
}

export function diatonicIndex(letter: Letter, octave: number): number {
  return octave * 7 + LETTERS.indexOf(letter);
}

/** Treble staff: bottom line is E4. Returns staff steps from that line. */
export function pitchToStaffSteps(p: Pitch): number {
  return diatonicIndex(p.letter, p.octave) - diatonicIndex("E", 4);
}

export function staffStepsToPitch(steps: number, accidental: Accidental = 0): Pitch {
  const idx = diatonicIndex("E", 4) + steps;
  const octave = Math.floor(idx / 7);
  const letter = LETTERS[((idx % 7) + 7) % 7];
  return { letter, octave, accidental };
}

export function pitchLabel(p: Pitch): string {
  const acc = p.accidental === 1 ? "♯" : p.accidental === -1 ? "♭" : p.accidental === 2 ? "𝄪" : p.accidental === -2 ? "𝄫" : "";
  return `${p.letter}${acc}${p.octave}`;
}

export function pitchesEqual(a: Pitch, b: Pitch): boolean {
  return a.letter === b.letter && a.octave === b.octave && a.accidental === b.accidental;
}

export function transposeDiatonic(p: Pitch, steps: number): Pitch {
  return staffStepsToPitch(pitchToStaffSteps(p) + steps, p.accidental);
}

/** Circle of fifths: +sharps / −flats. Order of sharps FCGDAEB. */
export const SHARP_ORDER: Letter[] = ["F", "C", "G", "D", "A", "E", "B"];
export const FLAT_ORDER: Letter[] = ["B", "E", "A", "D", "G", "C", "F"];

export const KEY_NAMES: Record<number, string> = {
  [-7]: "C♭ major",
  [-6]: "G♭ major",
  [-5]: "D♭ major",
  [-4]: "A♭ major",
  [-3]: "E♭ major",
  [-2]: "B♭ major",
  [-1]: "F major",
  0: "C major",
  1: "G major",
  2: "D major",
  3: "A major",
  4: "E major",
  5: "B major",
  6: "F♯ major",
  7: "C♯ major",
};

/** Staff steps from E4 for key-signature accidentals on treble. */
export const SHARP_STAFF_STEPS = [4, 1, 5, 2, 6, 3, 0]; // F5 C5 G5 D5 A5 E5 B4
export const FLAT_STAFF_STEPS = [2, 5, 1, 4, 0, 3, -1]; // B4 E5 A4 D5 G4 C5 F4

export function keyAccidentalForLetter(fifths: number, letter: Letter): Accidental {
  if (fifths > 0) {
    const n = SHARP_ORDER.indexOf(letter);
    return n >= 0 && n < fifths ? 1 : 0;
  }
  if (fifths < 0) {
    const n = FLAT_ORDER.indexOf(letter);
    return n >= 0 && n < -fifths ? -1 : 0;
  }
  return 0;
}

export function snapMidiToPitch(midi: number, fifths = 0): Pitch {
  const rounded = Math.round(midi);
  const pc = ((rounded % 12) + 12) % 12;
  const octave = Math.floor(rounded / 12) - 1;
  const map: Record<number, { letter: Letter; accidental: Accidental }> = {
    0: { letter: "C", accidental: 0 },
    1: { letter: fifths < 0 ? "D" : "C", accidental: fifths < 0 ? -1 : 1 },
    2: { letter: "D", accidental: 0 },
    3: { letter: fifths < 0 ? "E" : "D", accidental: fifths < 0 ? -1 : 1 },
    4: { letter: "E", accidental: 0 },
    5: { letter: "F", accidental: 0 },
    6: { letter: fifths < 0 ? "G" : "F", accidental: fifths < 0 ? -1 : 1 },
    7: { letter: "G", accidental: 0 },
    8: { letter: fifths < 0 ? "A" : "G", accidental: fifths < 0 ? -1 : 1 },
    9: { letter: "A", accidental: 0 },
    10: { letter: fifths < 0 ? "B" : "A", accidental: fifths < 0 ? -1 : 1 },
    11: { letter: "B", accidental: 0 },
  };
  const { letter, accidental } = map[pc];
  return { letter, octave, accidental };
}

export const VIOLIN_MIN_MIDI = 55; // G3
export const VIOLIN_MAX_MIDI = 100; // E7
