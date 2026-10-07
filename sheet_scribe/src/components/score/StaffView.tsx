import { useMemo, useRef, type MouseEvent, type RefObject } from "react";
import {
  accidentalStaffSteps,
  durationFlags,
  durationHasStem,
  isOpenHead,
  layoutScore,
  preludeWidth,
  staffY,
  STAFF_GAP,
  STAFF_HEIGHT,
  CLEF_W,
  LEFT_PAD,
  type LaidNote,
  type LaidSystem,
} from "@/lib/music/layout";
import type { Accidental } from "@/lib/music/pitch";
import type { Score, ThemeId } from "@/lib/music/score";
import { THEME_META } from "@/lib/music/export";

interface Props {
  score: Score;
  theme: ThemeId;
  width: number;
  selected: { measureIndex: number; noteIndex: number } | null;
  playingId: string | null;
  onSelect: (sel: { measureIndex: number; noteIndex: number } | null) => void;
  onInsert: (measureIndex: number, staffSteps: number, afterIndex?: number) => void;
  svgRef?: RefObject<SVGSVGElement | null>;
}

function TrebleClef({ x, y, fill }: { x: number; y: number; fill: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(1.15)`} fill={fill}>
      <path d="M11.2 44.6c0 4.8-3.2 8.4-8.1 8.4-4.8 0-8.1-3.4-8.1-8.2 0-4.7 3.4-8.1 8.2-8.1 1.3 0 2.5.3 3.6.8C6.4 23.8 7.8 8.8 14.6 2.4 18.2-1 23.6-1.4 27.2 2.1c3.8 3.7 4.1 10.6.2 20.4-2.5 6.3-6.3 12.6-10.5 18.8 2.6 2.2 4.2 5.4 4.2 9.1 0 7.3-6.1 12.2-13.6 12.2-7.7 0-13.6-5.1-13.6-12.4 0-6.8 5.2-11.8 12.4-12.3zm.4 12.4c4.1 0 7.2-2.7 7.2-6.3 0-3.4-2.2-5.8-5.9-7.4-3.3 5.2-5.8 9.4-7.4 13 1.6.5 3.7.7 6.1.7zM18.8 18.4c2.7-6.6 3.1-11.4 1.2-13.4-1.8-1.8-4.4-1.4-6.4.8-2.8 3.1-3.8 10.6-3.4 18.6 3.2-5.2 6-10.2 8.6-16z" />
    </g>
  );
}

function Sharp({ x, y, fill }: { x: number; y: number; fill: string }) {
  return (
    <g transform={`translate(${x} ${y})`} fill={fill} stroke={fill} strokeWidth="1.1">
      <path d="M-3.2-7 V7 M3.2-7 V7" fill="none" />
      <path d="M-5.4-2.4 H5.6 M-5.4 2.6 H5.6" strokeWidth="2.2" fill="none" />
    </g>
  );
}

function Flat({ x, y, fill }: { x: number; y: number; fill: string }) {
  return (
    <g transform={`translate(${x} ${y})`} fill={fill} stroke={fill} strokeWidth="1.2">
      <path d="M-1.6-9 V6.2" fill="none" />
      <path d="M-1.6 6.2 C4.8 3.2 5.4-1.4 -1.6-2.8 Z" stroke="none" opacity="0.95" />
    </g>
  );
}

function Natural({ x, y, fill }: { x: number; y: number; fill: string }) {
  return (
    <g transform={`translate(${x} ${y})`} fill="none" stroke={fill} strokeWidth="1.2">
      <path d="M-2.4 7 V-6 L2.4-3.4 V8" />
      <path d="M-2.4-1.6 H2.4 M-2.4 3.2 H2.4" strokeWidth="2" />
    </g>
  );
}

function AccidentalMark({
  kind,
  x,
  y,
  fill,
}: {
  kind: Accidental;
  x: number;
  y: number;
  fill: string;
}) {
  if (kind === 1 || kind === 2) return <Sharp x={x} y={y} fill={fill} />;
  if (kind === -1 || kind === -2) return <Flat x={x} y={y} fill={fill} />;
  if (kind === 0) return <Natural x={x} y={y} fill={fill} />;
  return null;
}

function RestGlyph({
  duration,
  x,
  yMid,
  fill,
}: {
  duration: number;
  x: number;
  yMid: number;
  fill: string;
}) {
  if (duration === 1) {
    return <rect x={x - 6} y={yMid - STAFF_GAP * 1.5} width={14} height={5.5} fill={fill} />;
  }
  if (duration === 2) {
    return <rect x={x - 6} y={yMid - STAFF_GAP * 0.5 - 1} width={14} height={5.5} fill={fill} />;
  }
  if (duration === 4) {
    return (
      <path
        d={`M ${x - 2} ${yMid - 16} c 8 8 2 12 -2 16 c 10 6 6 14 -1 18 c 3-8 8-10 1-16 c 8-6 2-12 -3-18 z`}
        fill={fill}
      />
    );
  }
  const flags = duration === 8 ? 1 : duration === 16 ? 2 : 3;
  return (
    <g fill={fill} stroke={fill} strokeWidth="1.4">
      <path d={`M ${x + 2} ${yMid - 12} L ${x - 3} ${yMid + 14}`} fill="none" />
      {Array.from({ length: flags }, (_, i) => (
        <ellipse key={i} cx={x - 5} cy={yMid - 10 + i * 6} rx={4.5} ry={3.2} />
      ))}
    </g>
  );
}

function NoteGlyph({
  laid,
  fill,
  selected,
  playing,
}: {
  laid: LaidNote;
  fill: string;
  selected: boolean;
  playing: boolean;
}) {
  const { note, x, y, stemUp } = laid;
  const color = playing ? "var(--color-play)" : selected ? "var(--color-select)" : fill;
  if (note.kind === "rest") {
    return (
      <g>
        {selected ? <circle cx={x} cy={y} r={12} fill="var(--color-select)" opacity="0.18" /> : null}
        <RestGlyph duration={note.duration} x={x} yMid={y} fill={color} />
        {note.dotted ? <circle cx={x + 12} cy={y} r={2.1} fill={color} /> : null}
      </g>
    );
  }
  const stemLen = STAFF_GAP * 3.2;
  const stemX = stemUp ? x + 5.6 : x - 5.6;
  const stemY2 = stemUp ? y - stemLen : y + stemLen;
  const flags = durationFlags(note.duration);
  const open = isOpenHead(note.duration);
  return (
    <g>
      {selected ? <circle cx={x} cy={y} r={14} fill="var(--color-select)" opacity="0.2" /> : null}
      {note.accidental !== null ? (
        <AccidentalMark kind={note.accidental} x={x - 14} y={y} fill={color} />
      ) : null}
      <ellipse
        cx={x}
        cy={y}
        rx={6.4}
        ry={4.7}
        transform={`rotate(-18 ${x} ${y})`}
        fill={open ? "none" : color}
        stroke={color}
        strokeWidth={open ? 1.6 : 0}
      />
      {durationHasStem(note.duration) ? (
        <line x1={stemX} y1={y} x2={stemX} y2={stemY2} stroke={color} strokeWidth="1.35" />
      ) : null}
      {flags > 0
        ? Array.from({ length: flags }, (_, i) => {
            const fy = stemUp ? stemY2 + i * 5.5 : stemY2 - i * 5.5;
            const dir = stemUp ? 1 : -1;
            return (
              <path
                key={i}
                d={`M ${stemX} ${fy} c 10 ${6 * dir} 12 ${14 * dir} 3 ${18 * dir}`}
                fill="none"
                stroke={color}
                strokeWidth="1.4"
              />
            );
          })
        : null}
      {note.dotted ? <circle cx={x + 11} cy={y - 1} r={2.05} fill={color} /> : null}
      {note.staccato ? <circle cx={x} cy={stemUp ? y + 9 : y - 9} r={1.7} fill={color} /> : null}
    </g>
  );
}

function LedgerLines({
  steps,
  x,
  staffTop,
  stroke,
}: {
  steps: number;
  x: number;
  staffTop: number;
  stroke: string;
}) {
  const lines: number[] = [];
  if (steps < 0) {
    for (let s = -2; s >= steps; s -= 2) lines.push(s);
  }
  if (steps > 8) {
    for (let s = 10; s <= steps; s += 2) lines.push(s);
  }
  return (
    <>
      {lines.map((s) => {
        const y = staffY(staffTop, s);
        return <line key={s} x1={x - 9} y1={y} x2={x + 9} y2={y} stroke={stroke} strokeWidth="1.15" />;
      })}
    </>
  );
}

export function StaffView({
  score,
  theme,
  width,
  selected,
  playingId,
  onSelect,
  onInsert,
  svgRef,
}: Props) {
  const localRef = useRef<SVGSVGElement>(null);
  const ref = svgRef ?? localRef;
  const layout = useMemo(() => layoutScore(score, width), [score, width]);
  const ink = THEME_META[theme].ink;
  const muted = THEME_META[theme].muted;

  const onStaffClick = (sys: LaidSystem, ev: MouseEvent<SVGRectElement>) => {
    const svg = ref.current;
    if (!svg) return;
    const pt = svg.createSVGPoint();
    pt.x = ev.clientX;
    pt.y = ev.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const loc = pt.matrixTransform(ctm.inverse());
    const staffTop = sys.y + layout.staffTopInSystem;
    const relY = loc.y - staffTop;
    const steps = Math.round((STAFF_HEIGHT - relY) / (STAFF_GAP / 2));
    const clamped = Math.max(-4, Math.min(16, steps));
    let target = sys.measures[sys.measures.length - 1];
    for (const m of sys.measures) {
      if (loc.x >= m.x && loc.x <= m.x + m.width) {
        target = m;
        break;
      }
    }
    if (!target) return;
    let after = -1;
    for (const n of target.notes) {
      if (loc.x >= n.x - 8) after = n.noteIndex;
    }
    onInsert(target.index, clamped, after);

  };

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      width="100%"
      role="img"
      aria-label={`${score.title} sheet music`}
      className="block h-auto select-none"
    >
      {layout.systems.map((sys) => {
        const staffTop = sys.y + layout.staffTopInSystem;
        const y1 = staffTop;
        const y5 = staffTop + STAFF_HEIGHT;
        const startX = 12;
        const endX = layout.width - 12;
        return (
          <g key={sys.index}>
            <rect
              x={startX}
              y={staffTop - 28}
              width={endX - startX}
              height={STAFF_HEIGHT + 56}
              fill="transparent"
              className="cursor-crosshair"
              onClick={(e) => onStaffClick(sys, e)}
            />
            {Array.from({ length: 5 }, (_, i) => (
              <line
                key={i}
                x1={startX}
                y1={staffTop + i * STAFF_GAP}
                x2={endX}
                y2={staffTop + i * STAFF_GAP}
                stroke={ink}
                strokeOpacity="0.72"
                strokeWidth="1.15"
              />
            ))}
            <TrebleClef x={LEFT_PAD - 6} y={staffTop - 8} fill={ink} />
            {accidentalStaffSteps(score.fifths).map((steps, i) => (
              <AccidentalMark
                key={i}
                kind={score.fifths > 0 ? 1 : -1}
                x={LEFT_PAD + CLEF_W + i * 12}
                y={staffY(staffTop, steps)}
                fill={ink}
              />
            ))}
            {sys.showTime ? (
              <g
                fontFamily="var(--font-display)"
                fontWeight="600"
                fontSize="22"
                fill={ink}
                textAnchor="middle"
              >
                <text x={preludeWidth(score.fifths, true) - 16} y={staffTop + 18}>
                  {score.time.beats}
                </text>
                <text x={preludeWidth(score.fifths, true) - 16} y={staffTop + 40}>
                  {score.time.beatType}
                </text>
              </g>
            ) : null}
            {sys.measures.map((m) => (
              <g key={m.index}>
                <line
                  x1={m.x + m.width}
                  y1={y1}
                  x2={m.x + m.width}
                  y2={y5}
                  stroke={ink}
                  strokeWidth={m.index === score.measures.length - 1 ? 2.4 : 1.2}
                />
                {m.index === score.measures.length - 1 ? (
                  <line
                    x1={m.x + m.width - 5}
                    y1={y1}
                    x2={m.x + m.width - 5}
                    y2={y5}
                    stroke={ink}
                    strokeWidth="1.15"
                  />
                ) : null}
                {m.notes.length === 0 ? (
                  <text
                    x={m.x + m.width / 2}
                    y={staffTop + STAFF_HEIGHT + 22}
                    textAnchor="middle"
                    fill={muted}
                    fontSize="10"
                    fontFamily="var(--font-body)"
                    className="pointer-events-none"
                  >
                    {m.index + 1}
                  </text>
                ) : (
                  <text
                    x={m.x + 8}
                    y={staffTop + STAFF_HEIGHT + 22}
                    fill={muted}
                    fontSize="10"
                    fontFamily="var(--font-body)"
                  >
                    {m.index + 1}
                  </text>
                )}
                {m.notes.map((ln) => (
                  <g
                    key={ln.note.id}
                    data-note={ln.note.id}
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect({ measureIndex: ln.measureIndex, noteIndex: ln.noteIndex });
                    }}
                  >
                    <circle cx={ln.x} cy={ln.y} r={14} fill="transparent" />
                    {ln.note.kind === "note" ? (
                      <LedgerLines steps={ln.staffSteps} x={ln.x} staffTop={staffTop} stroke={ink} />
                    ) : null}
                    <NoteGlyph
                      laid={ln}
                      fill={ink}
                      selected={
                        selected?.measureIndex === ln.measureIndex && selected.noteIndex === ln.noteIndex
                      }
                      playing={playingId === ln.note.id}
                    />
                  </g>
                ))}
              </g>
            ))}
          </g>
        );
      })}
    </svg>
  );
}
