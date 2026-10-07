import {
  Circle,
  Dot,
  Mic,
  Pause,
  Play,
  Redo2,
  Square,
  Trash2,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { KEY_NAMES } from "@/lib/music/pitch";
import type { Duration } from "@/lib/music/score";
import { instrumentLabel, useEditor } from "@/lib/store";
import { cn } from "@/lib/utils";

const DURATIONS: { d: Duration; label: string }[] = [
  { d: 1, label: "1" },
  { d: 2, label: "½" },
  { d: 4, label: "¼" },
  { d: 8, label: "⅛" },
  { d: 16, label: "16" },
  { d: 32, label: "32" },
];

interface Props {
  onPlayAll: () => void;
  onPlayBar: () => void;
  onStop: () => void;
  playing: boolean;
}

export function Toolbar({ onPlayAll, onPlayBar, onStop, playing }: Props) {
  const duration = useEditor((s) => s.duration);
  const dotted = useEditor((s) => s.dotted);
  const accidental = useEditor((s) => s.accidental);
  const restMode = useEditor((s) => s.restMode);
  const score = useEditor((s) => s.score);
  const setTool = useEditor((s) => s.setTool);
  const updateMeta = useEditor((s) => s.updateMeta);
  const undo = useEditor((s) => s.undo);
  const redo = useEditor((s) => s.redo);
  const addMeasure = useEditor((s) => s.addMeasure);
  const deleteSelected = useEditor((s) => s.deleteSelected);
  const setTranscribeOpen = useEditor((s) => s.setTranscribeOpen);
  const toggleStaccato = useEditor((s) => s.toggleStaccato);

  return (
    <div className="flex flex-col gap-2 border-b border-border bg-chrome px-3 py-2 md:px-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center rounded-md border border-border bg-raised p-0.5">
          {DURATIONS.map(({ d, label }) => (
            <button
              key={d}
              type="button"
              onClick={() => setTool({ duration: d, restMode: false })}
              className={cn(
                "min-h-8 min-w-8 rounded-sm px-1.5 font-display text-sm",
                duration === d && !restMode ? "bg-ink text-paper" : "text-fg hover:bg-chrome",
              )}
              aria-label={`${d === 1 ? "Whole" : label} note`}
              aria-pressed={duration === d && !restMode}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setTool({ dotted: !dotted })}
          className={cn(
            "inline-flex size-8 items-center justify-center rounded-md border border-border",
            dotted ? "bg-ink text-paper" : "bg-raised text-fg",
          )}
          aria-pressed={dotted}
          aria-label="Dotted"
        >
          <Dot className="size-5" />
        </button>
        <button
          type="button"
          onClick={() => setTool({ restMode: !restMode })}
          className={cn(
            "inline-flex h-8 items-center gap-1 rounded-md border border-border px-2 text-xs font-medium",
            restMode ? "bg-ink text-paper" : "bg-raised text-fg",
          )}
          aria-pressed={restMode}
        >
          <Square className="size-3.5" />
          Rest
        </button>
        <div className="flex items-center rounded-md border border-border bg-raised p-0.5 font-display text-base">
          {(
            [
              [null, "♮"],
              [1, "♯"],
              [-1, "♭"],
            ] as const
          ).map(([val, glyph]) => (
            <button
              key={glyph}
              type="button"
              onClick={() => setTool({ accidental: accidental === val ? null : val })}
              className={cn(
                "min-h-8 min-w-8 rounded-sm",
                accidental === val ? "bg-ink text-paper" : "text-fg hover:bg-chrome",
              )}
              aria-label={glyph}
              aria-pressed={accidental === val}
            >
              {glyph}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={toggleStaccato}
          className="inline-flex size-8 items-center justify-center rounded-md border border-border bg-raised text-fg"
          aria-label="Staccato on selected"
        >
          <Circle className="size-3 fill-current" />
        </button>
        <div className="mx-1 hidden h-6 w-px bg-border sm:block" />
        <Button size="sm" variant="secondary" onClick={playing ? onStop : onPlayAll} aria-label="Play score">
          {playing ? <Pause /> : <Play />}
          <span className="hidden sm:inline">Play</span>
        </Button>
        <Button size="sm" variant="ghost" onClick={onPlayBar}>
          Bar
        </Button>
        <Button size="icon-sm" variant="ghost" onClick={undo} aria-label="Undo">
          <Undo2 />
        </Button>
        <Button size="icon-sm" variant="ghost" onClick={redo} aria-label="Redo">
          <Redo2 />
        </Button>
        <Button size="icon-sm" variant="ghost" onClick={deleteSelected} aria-label="Delete note">
          <Trash2 />
        </Button>
        <Button size="sm" variant="ghost" onClick={addMeasure}>
          + Bar
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setTranscribeOpen(true)}>
          <Mic />
          Hear
        </Button>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-36 flex-1 flex-col gap-1 text-[11px] tracking-wide text-muted uppercase">
          Title
          <input
            value={score.title}
            onChange={(e) => updateMeta({ title: e.target.value })}
            className="h-9 rounded-md border border-border bg-raised px-2 font-display text-base font-medium tracking-normal text-fg normal-case"
          />
        </label>
        <label className="flex min-w-32 flex-1 flex-col gap-1 text-[11px] tracking-wide text-muted uppercase">
          Composer
          <input
            value={score.composer}
            onChange={(e) => updateMeta({ composer: e.target.value })}
            className="h-9 rounded-md border border-border bg-raised px-2 font-body text-sm tracking-normal text-fg normal-case"
          />
        </label>
        <label className="flex w-28 flex-col gap-1 text-[11px] tracking-wide text-muted uppercase">
          Key
          <select
            value={score.fifths}
            onChange={(e) => updateMeta({ fifths: Number(e.target.value) })}
            className="h-9 rounded-md border border-border bg-raised px-2 text-sm text-fg normal-case"
          >
            {[-7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7].map((k) => (
              <option key={k} value={k}>
                {KEY_NAMES[k]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex w-24 flex-col gap-1 text-[11px] tracking-wide text-muted uppercase">
          Time
          <select
            value={`${score.time.beats}/${score.time.beatType}`}
            onChange={(e) => {
              const [beats, beatType] = e.target.value.split("/").map(Number);
              updateMeta({ time: { beats, beatType: beatType as 2 | 4 | 8 } });
            }}
            className="h-9 rounded-md border border-border bg-raised px-2 text-sm text-fg normal-case"
          >
            {["2/4", "3/4", "4/4", "6/8", "3/8", "2/2"].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="flex w-24 flex-col gap-1 text-[11px] tracking-wide text-muted uppercase">
          Tempo
          <input
            type="number"
            min={40}
            max={220}
            value={score.tempo}
            onChange={(e) => updateMeta({ tempo: Number(e.target.value) || 96 })}
            className="h-9 rounded-md border border-border bg-raised px-2 text-sm text-fg normal-case"
          />
        </label>
        <label className="flex w-28 flex-col gap-1 text-[11px] tracking-wide text-muted uppercase">
          Voice
          <select
            value={score.instrument}
            onChange={(e) => updateMeta({ instrument: e.target.value as ScoreInstrument })}
            className="h-9 rounded-md border border-border bg-raised px-2 text-sm text-fg normal-case"
          >
            {(["violin", "guitar", "piano"] as const).map((i) => (
              <option key={i} value={i}>
                {instrumentLabel(i)}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}

type ScoreInstrument = "violin" | "guitar" | "piano";
