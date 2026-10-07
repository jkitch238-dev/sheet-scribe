import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Download, FilePlus, Save } from "lucide-react";
import { StaffView } from "@/components/score/StaffView";
import { Toolbar } from "@/components/score/Toolbar";
import { TranscribePanel } from "@/components/score/TranscribePanel";
import { Button } from "@/components/ui/button";
import { exportPdf, exportPng, THEME_META } from "@/lib/music/export";
import { playScore, stopPlayback } from "@/lib/music/playback";
import { STARTERS } from "@/lib/music/samples";
import { scoreToMusicXml, downloadText } from "@/lib/music/xml";
import type { ThemeId } from "@/lib/music/score";
import { useEditor } from "@/lib/store";
import { cn } from "@/lib/utils";

export function FolioApp() {
  const score = useEditor((s) => s.score);
  const theme = useEditor((s) => s.theme);
  const selected = useEditor((s) => s.selected);
  const playingId = useEditor((s) => s.playingId);
  const library = useEditor((s) => s.library);
  const select = useEditor((s) => s.select);
  const insertAt = useEditor((s) => s.insertAt);
  const setTheme = useEditor((s) => s.setTheme);
  const setPlayingId = useEditor((s) => s.setPlayingId);
  const newScore = useEditor((s) => s.newScore);
  const saveToLibrary = useEditor((s) => s.saveToLibrary);
  const loadFromLibrary = useEditor((s) => s.loadFromLibrary);
  const deleteFromLibrary = useEditor((s) => s.deleteFromLibrary);
  const deleteSelected = useEditor((s) => s.deleteSelected);
  const nudgeSelected = useEditor((s) => s.nudgeSelected);
  const undo = useEditor((s) => s.undo);
  const redo = useEditor((s) => s.redo);
  const toggleDotSelected = useEditor((s) => s.toggleDotSelected);
  const setSelectedAccidental = useEditor((s) => s.setSelectedAccidental);
  const cycleSelectedDuration = useEditor((s) => s.cycleSelectedDuration);

  const svgRef = useRef<SVGSVGElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(860);
  const [playing, setPlaying] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    const el = sheetRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setWidth(Math.max(320, el.clientWidth - 8));
    });
    ro.observe(el);
    setWidth(Math.max(320, el.clientWidth - 8));
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        deleteSelected();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        nudgeSelected(1);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        nudgeSelected(-1);
      } else if (e.key === ".") {
        toggleDotSelected();
      } else if (e.key === "#") {
        setSelectedAccidental(1);
      } else if (e.key === "b" && !e.metaKey) {
        setSelectedAccidental(-1);
      } else if (e.key === "=" || e.key === "n") {
        setSelectedAccidental(0);
      } else if (e.key === "[") {
        cycleSelectedDuration(-1);
      } else if (e.key === "]") {
        cycleSelectedDuration(1);
      } else if (e.key === " ") {
        e.preventDefault();
        if (playing) stopPlay();
        else void playAll();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const stopPlay = () => {
    stopPlayback();
    setPlaying(false);
    setPlayingId(null);
  };

  const playAll = async () => {
    setPlaying(true);
    await playScore(score, {
      onEvent: (ev) => setPlayingId(ev?.note.id ?? null),
      onDone: () => {
        setPlaying(false);
        setPlayingId(null);
      },
    });
  };

  const playBar = async () => {
    const mi = selected?.measureIndex ?? 0;
    setPlaying(true);
    await playScore(score, {
      fromMeasure: mi,
      onlyMeasure: true,
      onEvent: (ev) => setPlayingId(ev?.note.id ?? null),
      onDone: () => {
        setPlaying(false);
        setPlayingId(null);
      },
    });
  };

  const fileBase = useMemo(
    () => (score.title || "folio").replace(/[^\w]+/g, "-").toLowerCase(),
    [score.title],
  );

  const onSave = () => {
    saveToLibrary();
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1400);
  };

  const meta = THEME_META[theme];

  return (
    <div className={cn("flex min-h-dvh flex-col bg-bg text-fg", `theme-${theme}`)}>
      <header className="flex items-center justify-between gap-3 border-b border-border bg-chrome px-3 py-2.5 md:px-5">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-md bg-accent font-display text-lg text-accent-fg">
            F
          </div>
          <div>
            <p className="font-display text-lg leading-tight tracking-tight">Folio</p>
            <p className="text-[11px] tracking-[0.14em] text-muted uppercase">Atelier</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="ghost" onClick={() => setMenu((v) => !v)} className="md:hidden">
            Menu
          </Button>
          <div className="hidden items-center gap-1.5 md:flex">
            <ExportMenu fileBase={fileBase} svgRef={svgRef} theme={theme} />
            <Button size="sm" variant="secondary" onClick={onSave}>
              <Save />
              {savedFlash ? "Kept" : "Keep"}
            </Button>
          </div>
        </div>
      </header>

      <Toolbar onPlayAll={() => void playAll()} onPlayBar={() => void playBar()} onStop={stopPlay} playing={playing} />

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <aside
          className={cn(
            "border-border bg-chrome md:flex md:w-56 md:shrink-0 md:flex-col md:border-r",
            menu ? "block border-b" : "hidden md:flex",
          )}
        >
          <div className="p-3 md:p-4">
            <p className="text-[11px] tracking-[0.16em] text-muted uppercase">Paper</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(Object.keys(THEME_META) as ThemeId[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTheme(id)}
                  className={cn(
                    "rounded-md border px-2 py-2 text-left text-xs",
                    theme === id ? "border-fg bg-raised" : "border-border bg-chrome hover:bg-raised",
                  )}
                >
                  {THEME_META[id].name}
                </button>
              ))}
            </div>
            <p className="mt-5 text-[11px] tracking-[0.16em] text-muted uppercase">New page</p>
            <div className="mt-2 flex flex-col gap-1">
              {STARTERS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    newScore(s.make());
                    setMenu(false);
                  }}
                  className="flex h-9 items-center gap-2 rounded-md px-2 text-left text-sm hover:bg-raised"
                >
                  <FilePlus className="size-3.5 text-muted" />
                  {s.label}
                </button>
              ))}
            </div>
            <p className="mt-5 text-[11px] tracking-[0.16em] text-muted uppercase">Kept scores</p>
            <ul className="mt-2 flex flex-col gap-1">
              {library.length === 0 ? (
                <li className="px-2 text-sm text-muted">Nothing kept yet.</li>
              ) : (
                library.map((item) => (
                  <li key={item.id} className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        loadFromLibrary(item.id);
                        setMenu(false);
                      }}
                      className="min-w-0 flex-1 truncate rounded-md px-2 py-1.5 text-left text-sm hover:bg-raised"
                    >
                      {item.title}
                    </button>
                    <button
                      type="button"
                      className="px-1 text-xs text-muted hover:text-danger"
                      onClick={() => deleteFromLibrary(item.id)}
                      aria-label={`Remove ${item.title}`}
                    >
                      ×
                    </button>
                  </li>
                ))
              )}
            </ul>
            <div className="mt-4 flex flex-col gap-2 md:hidden">
              <ExportMenu fileBase={fileBase} svgRef={svgRef} theme={theme} />
              <Button size="sm" variant="secondary" onClick={onSave}>
                <Save /> Keep
              </Button>
            </div>
            <p className="mt-6 text-[11px] leading-relaxed text-muted">
              Click the staff to write. Arrows move pitch. Delete removes. Space plays.
            </p>
          </div>
        </aside>

        <main className="min-w-0 flex-1 overflow-auto bg-well p-3 md:p-6">
          <div
            ref={sheetRef}
            className="sheet mx-auto max-w-5xl overflow-hidden rounded-sm shadow-page"
            style={{
              backgroundColor: meta.paper,
              color: meta.ink,
              backgroundImage: meta.texture ? `url(${meta.texture})` : undefined,
              backgroundSize: "cover",
            }}
          >
            <div className="px-5 pt-8 pb-2 text-center md:px-10">
              <h1 className="font-display text-3xl tracking-tight md:text-4xl" style={{ color: meta.ink }}>
                {score.title || "Untitled"}
              </h1>
              <p className="mt-1 font-body text-sm italic" style={{ color: meta.muted }}>
                {score.composer || " "}
              </p>
              <p className="mt-1 text-[11px] tracking-[0.2em] uppercase" style={{ color: meta.muted }}>
                {score.instrument} · {THEME_META[theme].name}
              </p>
            </div>
            <div className="px-1 pb-8 md:px-4">
              <StaffView
                score={score}
                theme={theme}
                width={width}
                selected={selected}
                playingId={playingId}
                onSelect={select}
                onInsert={insertAt}
                svgRef={svgRef}
              />
            </div>
          </div>
        </main>
      </div>
      <TranscribePanel />
    </div>
  );
}

function ExportMenu({
  fileBase,
  svgRef,
  theme,
}: {
  fileBase: string;
  svgRef: RefObject<SVGSVGElement | null>;
  theme: ThemeId;
}) {
  const score = useEditor((s) => s.score);
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (kind: "png" | "pdf" | "xml") => {
    setBusy(kind);
    try {
      if (kind === "xml") {
        downloadText(`${fileBase}.musicxml`, scoreToMusicXml(score), "application/vnd.recordare.musicxml+xml");
      } else if (svgRef.current && kind === "png") {
        await exportPng(svgRef.current, theme, `${fileBase}.png`);
      } else if (svgRef.current && kind === "pdf") {
        await exportPdf(svgRef.current, theme, `${fileBase}.pdf`);
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-wrap gap-1">
      <Button size="sm" variant="secondary" onClick={() => void run("png")} disabled={!!busy}>
        <Download />
        {busy === "png" ? "…" : "Image"}
      </Button>
      <Button size="sm" variant="secondary" onClick={() => void run("pdf")} disabled={!!busy}>
        {busy === "pdf" ? "…" : "PDF"}
      </Button>
      <Button size="sm" variant="ghost" onClick={() => void run("xml")} disabled={!!busy}>
        MusicXML
      </Button>
    </div>
  );
}
