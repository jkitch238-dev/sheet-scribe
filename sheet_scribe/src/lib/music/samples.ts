import type { Note, Score } from "./score";
import { emptyMeasure, emptyScore, makeNote, makeRest } from "./score";
import type { Pitch } from "./pitch";

function p(letter: Pitch["letter"], octave: number, accidental: Pitch["accidental"] = 0): Pitch {
  return { letter, octave, accidental };
}

function n(letter: Pitch["letter"], octave: number, duration: Note["duration"], extra: Partial<Note> = {}): Note {
  return makeNote({ pitch: p(letter, octave), duration, ...extra });
}

export function odeToJoy(): Score {
  const measures = [
    { notes: [n("F", 4, 4, { accidental: 1 }), n("F", 4, 4, { accidental: 1 }), n("G", 4, 4), n("A", 4, 4)] },
    { notes: [n("A", 4, 4), n("G", 4, 4), n("F", 4, 4, { accidental: 1 }), n("E", 4, 4)] },
    { notes: [n("D", 4, 4), n("D", 4, 4), n("E", 4, 4), n("F", 4, 4, { accidental: 1 })] },
    { notes: [n("F", 4, 4, { accidental: 1, dotted: true }), n("E", 4, 8), n("E", 4, 2)] },
    { notes: [n("F", 4, 4, { accidental: 1 }), n("F", 4, 4, { accidental: 1 }), n("G", 4, 4), n("A", 4, 4)] },
    { notes: [n("A", 4, 4), n("G", 4, 4), n("F", 4, 4, { accidental: 1 }), n("E", 4, 4)] },
    { notes: [n("D", 4, 4), n("D", 4, 4), n("E", 4, 4), n("F", 4, 4, { accidental: 1 })] },
    { notes: [n("E", 4, 4, { dotted: true }), n("D", 4, 8), n("D", 4, 2)] },
  ].map((m) => ({ ...emptyMeasure(), notes: m.notes }));

  return emptyScore({
    title: "Ode to Joy",
    composer: "L. van Beethoven",
    instrument: "violin",
    fifths: 2,
    time: { beats: 4, beatType: 4 },
    tempo: 108,
    measures,
  });
}

export function gMajorScale(): Score {
  const notes = [
    n("G", 4, 4),
    n("A", 4, 4),
    n("B", 4, 4),
    n("C", 5, 4),
    n("D", 5, 4),
    n("E", 5, 4),
    n("F", 5, 4, { accidental: 1 }),
    n("G", 5, 4),
    n("G", 5, 4),
    n("F", 5, 4, { accidental: 1 }),
    n("E", 5, 4),
    n("D", 5, 4),
    n("C", 5, 4),
    n("B", 4, 4),
    n("A", 4, 4),
    n("G", 4, 4),
  ];
  const measures = [0, 1, 2, 3].map((i) => ({
    ...emptyMeasure(),
    notes: notes.slice(i * 4, i * 4 + 4),
  }));
  return emptyScore({
    title: "G Major Scale",
    composer: "Practice",
    instrument: "violin",
    fifths: 1,
    measures: [...measures, emptyMeasure(), emptyMeasure(), emptyMeasure(), emptyMeasure()],
    tempo: 80,
  });
}

export function twinkle(): Score {
  const q = (letter: Pitch["letter"], oct: number): Note => n(letter, oct, 4);
  const h = (letter: Pitch["letter"], oct: number): Note => n(letter, oct, 2);
  const measures = [
    [q("C", 5), q("C", 5), q("G", 5), q("G", 5)],
    [q("A", 5), q("A", 5), h("G", 5)],
    [q("F", 5), q("F", 5), q("E", 5), q("E", 5)],
    [q("D", 5), q("D", 5), h("C", 5)],
  ].map((notes) => ({ ...emptyMeasure(), notes }));
  return emptyScore({
    title: "Twinkle, Twinkle",
    composer: "Traditional",
    instrument: "violin",
    fifths: 0,
    measures: [...measures, emptyMeasure(), emptyMeasure(), emptyMeasure(), emptyMeasure()],
    tempo: 100,
  });
}

export function restBarDemo(): Score {
  return emptyScore({
    title: "Quiet page",
    measures: Array.from({ length: 4 }, () => ({
      ...emptyMeasure(),
      notes: [makeRest(1)],
    })),
  });
}

export const STARTERS = [
  { id: "blank", label: "Blank folio", make: () => emptyScore({ title: "Untitled", composer: "" }) },
  { id: "ode", label: "Ode to Joy", make: odeToJoy },
  { id: "scale", label: "G major scale", make: gMajorScale },
  { id: "twinkle", label: "Twinkle, Twinkle", make: twinkle },
];
