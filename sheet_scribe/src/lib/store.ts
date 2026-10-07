import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Accidental } from "@/lib/music/pitch";
import { pitchToStaffSteps, staffStepsToPitch } from "@/lib/music/pitch";
import type { Duration, Instrument, Note, Score, ThemeId } from "@/lib/music/score";
import {
  cloneScore,
  emptyMeasure,
  emptyScore,
  ensureTrailingEmpty,
  makeNote,
  makeRest,
} from "@/lib/music/score";
import { odeToJoy } from "@/lib/music/samples";

export interface LibraryItem {
  id: string;
  title: string;
  updatedAt: number;
  score: Score;
}

interface EditorState {
  hydrated: boolean;
  library: LibraryItem[];
  score: Score;
  selected: { measureIndex: number; noteIndex: number } | null;
  duration: Duration;
  dotted: boolean;
  accidental: Accidental | null;
  restMode: boolean;
  theme: ThemeId;
  playingId: string | null;
  history: Score[];
  future: Score[];
  transcribeOpen: boolean;
  setHydrated: (v: boolean) => void;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  setScore: (score: Score, record?: boolean) => void;
  updateMeta: (
    patch: Partial<Pick<Score, "title" | "composer" | "tempo" | "fifths" | "time" | "instrument">>,
  ) => void;
  select: (sel: EditorState["selected"]) => void;
  setTool: (patch: Partial<Pick<EditorState, "duration" | "dotted" | "accidental" | "restMode">>) => void;
  setTheme: (theme: ThemeId) => void;
  insertAt: (measureIndex: number, staffSteps: number, afterIndex?: number) => void;
  addMeasure: () => void;
  deleteSelected: () => void;
  nudgeSelected: (diatonic: number) => void;
  cycleSelectedDuration: (dir: 1 | -1) => void;
  toggleDotSelected: () => void;
  setSelectedAccidental: (a: Accidental | null) => void;
  toggleStaccato: () => void;
  newScore: (score?: Score) => void;
  saveToLibrary: () => void;
  loadFromLibrary: (id: string) => void;
  deleteFromLibrary: (id: string) => void;
  appendNotes: (notes: Note[]) => void;
  setPlayingId: (id: string | null) => void;
  setTranscribeOpen: (v: boolean) => void;
}

function applyNote(state: EditorState, staffSteps: number): Note {
  if (state.restMode) return makeRest(state.duration, state.dotted);
  return makeNote({
    pitch: staffStepsToPitch(staffSteps, 0),
    duration: state.duration,
    dotted: state.dotted,
    accidental: state.accidental,
  });
}

const DURATIONS: Duration[] = [1, 2, 4, 8, 16, 32];

export const useEditor = create<EditorState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      library: [],
      score: odeToJoy(),
      selected: null,
      duration: 4,
      dotted: false,
      accidental: null,
      restMode: false,
      theme: "parchment",
      playingId: null,
      history: [],
      future: [],
      transcribeOpen: false,
      setHydrated: (v) => set({ hydrated: v }),
      pushHistory: () => {
        const { score, history } = get();
        set({ history: [...history.slice(-49), cloneScore(score)], future: [] });
      },
      undo: () => {
        const { history, score, future } = get();
        const prev = history[history.length - 1];
        if (!prev) return;
        set({
          score: prev,
          history: history.slice(0, -1),
          future: [cloneScore(score), ...future].slice(0, 50),
        });
      },
      redo: () => {
        const { future, score, history } = get();
        const next = future[0];
        if (!next) return;
        set({
          score: next,
          future: future.slice(1),
          history: [...history, cloneScore(score)],
        });
      },
      setScore: (score, record = true) => {
        if (record) get().pushHistory();
        set({ score: { ...score, updatedAt: Date.now() } });
      },
      updateMeta: (patch) => {
        get().pushHistory();
        set({ score: { ...get().score, ...patch, updatedAt: Date.now() } });
      },
      select: (selected) => set({ selected }),
      setTool: (patch) => set(patch),
      setTheme: (theme) => set({ theme }),
      insertAt: (measureIndex, staffSteps, afterIndex) => {
        const s = get();
        s.pushHistory();
        const score = cloneScore(s.score);
        while (measureIndex >= score.measures.length) score.measures.push(emptyMeasure());
        const m = score.measures[measureIndex];
        const note = applyNote(s, staffSteps);
        const idx = afterIndex === undefined ? m.notes.length : afterIndex + 1;
        m.notes.splice(idx, 0, note);
        set({
          score: ensureTrailingEmpty({ ...score, updatedAt: Date.now() }),
          selected: { measureIndex, noteIndex: idx },
        });
      },
      addMeasure: () => {
        get().pushHistory();
        const score = cloneScore(get().score);
        score.measures.push(emptyMeasure());
        score.updatedAt = Date.now();
        set({ score });
      },
      deleteSelected: () => {
        const { selected, score } = get();
        if (!selected) return;
        get().pushHistory();
        const next = cloneScore(score);
        const m = next.measures[selected.measureIndex];
        if (!m) return;
        m.notes.splice(selected.noteIndex, 1);
        const ni = Math.min(selected.noteIndex, m.notes.length - 1);
        set({
          score: { ...next, updatedAt: Date.now() },
          selected: ni >= 0 ? { measureIndex: selected.measureIndex, noteIndex: ni } : null,
        });
      },
      nudgeSelected: (diatonic) => {
        const { selected, score } = get();
        if (!selected) return;
        const m = score.measures[selected.measureIndex];
        const n = m?.notes[selected.noteIndex];
        if (!n || n.kind === "rest") return;
        get().pushHistory();
        const next = cloneScore(score);
        const note = next.measures[selected.measureIndex].notes[selected.noteIndex];
        note.pitch = staffStepsToPitch(pitchToStaffSteps(note.pitch) + diatonic, note.pitch.accidental);
        set({ score: { ...next, updatedAt: Date.now() } });
      },
      cycleSelectedDuration: (dir) => {
        const { selected, score } = get();
        if (!selected) return;
        get().pushHistory();
        const next = cloneScore(score);
        const note = next.measures[selected.measureIndex].notes[selected.noteIndex];
        if (!note) return;
        const i = DURATIONS.indexOf(note.duration);
        note.duration = DURATIONS[Math.min(DURATIONS.length - 1, Math.max(0, i + dir))];
        set({ score: { ...next, updatedAt: Date.now() }, duration: note.duration });
      },
      toggleDotSelected: () => {
        const { selected, score } = get();
        if (!selected) return;
        get().pushHistory();
        const next = cloneScore(score);
        const note = next.measures[selected.measureIndex].notes[selected.noteIndex];
        if (!note) return;
        note.dotted = !note.dotted;
        set({ score: { ...next, updatedAt: Date.now() }, dotted: note.dotted });
      },
      setSelectedAccidental: (a) => {
        const { selected, score } = get();
        if (!selected) return;
        get().pushHistory();
        const next = cloneScore(score);
        const note = next.measures[selected.measureIndex].notes[selected.noteIndex];
        if (!note || note.kind === "rest") return;
        note.accidental = a;
        set({ score: { ...next, updatedAt: Date.now() }, accidental: a });
      },
      toggleStaccato: () => {
        const { selected, score } = get();
        if (!selected) return;
        get().pushHistory();
        const next = cloneScore(score);
        const note = next.measures[selected.measureIndex].notes[selected.noteIndex];
        if (!note || note.kind === "rest") return;
        note.staccato = !note.staccato;
        set({ score: { ...next, updatedAt: Date.now() } });
      },
      newScore: (score) => {
        get().pushHistory();
        set({ score: score ?? emptyScore(), selected: null });
      },
      saveToLibrary: () => {
        const { score, library } = get();
        const item: LibraryItem = {
          id: score.id,
          title: score.title || "Untitled",
          updatedAt: Date.now(),
          score: cloneScore({ ...score, updatedAt: Date.now() }),
        };
        const rest = library.filter((x) => x.id !== score.id);
        set({ library: [item, ...rest] });
      },
      loadFromLibrary: (id) => {
        const item = get().library.find((x) => x.id === id);
        if (!item) return;
        get().pushHistory();
        set({ score: cloneScore(item.score), selected: null });
      },
      deleteFromLibrary: (id) => {
        set({ library: get().library.filter((x) => x.id !== id) });
      },
      appendNotes: (notes) => {
        if (!notes.length) return;
        get().pushHistory();
        const score = cloneScore(get().score);
        let m = score.measures[score.measures.length - 1];
        if (!m) {
          m = emptyMeasure();
          score.measures.push(m);
        }
        for (const note of notes) m.notes.push(note);
        set({ score: ensureTrailingEmpty({ ...score, updatedAt: Date.now() }) });
      },
      setPlayingId: (playingId) => set({ playingId }),
      setTranscribeOpen: (transcribeOpen) => set({ transcribeOpen }),
    }),
    {
      name: "folio-atelier",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => ({
        library: s.library,
        score: s.score,
        theme: s.theme,
        duration: s.duration,
      }),
    },
  ),
);

export function instrumentLabel(i: Instrument): string {
  return i === "violin" ? "Violin" : i === "guitar" ? "Guitar" : "Piano";
}
