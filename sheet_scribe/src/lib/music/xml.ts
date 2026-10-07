import type { Accidental } from "./pitch";
import type { Score } from "./score";
import { durationUnits } from "./score";

const TYPE_NAME: Record<number, string> = {
  1: "whole",
  2: "half",
  4: "quarter",
  8: "eighth",
  16: "16th",
  32: "32nd",
};

function accXml(a: Accidental | null): string {
  if (a === 1) return "<accidental>sharp</accidental>";
  if (a === -1) return "<accidental>flat</accidental>";
  if (a === 0) return "<accidental>natural</accidental>";
  if (a === 2) return "<accidental>double-sharp</accidental>";
  if (a === -2) return "<accidental>flat-flat</accidental>";
  return "";
}

function escapeXml(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => {
    if (ch === "&") return `\u0026amp;`;
    if (ch === "<") return `\u0026lt;`;
    if (ch === ">") return `\u0026gt;`;
    if (ch === '"') return `\u0026quot;`;
    return `\u0026apos;`;
  });
}

export function scoreToMusicXml(score: Score): string {
  const divisions = 4;
  const parts = score.measures
    .map((m, i) => {
      const notes = m.notes
        .map((n) => {
          const dur = durationUnits(n.duration, n.dotted);
          const type = TYPE_NAME[n.duration];
          const dots = n.dotted ? "<dot/>" : "";
          if (n.kind === "rest") {
            return `<note><rest/><duration>${dur}</duration><type>${type}</type>${dots}</note>`;
          }
          const step = n.pitch.letter;
          const octave = n.pitch.octave;
          const alter =
            n.accidental !== null && n.accidental !== 0 ? `<alter>${n.accidental}</alter>` : "";
          const acc = accXml(n.accidental);
          const artic = n.staccato
            ? "<notations><articulations><staccato/></articulations></notations>"
            : "";
          return `<note><pitch><step>${step}</step>${alter}<octave>${octave}</octave></pitch><duration>${dur}</duration><type>${type}</type>${dots}${acc}${artic}</note>`;
        })
        .join("");
      const attrs =
        i === 0
          ? `<attributes><divisions>${divisions}</divisions><key><fifths>${score.fifths}</fifths></key><time><beats>${score.time.beats}</beats><beat-type>${score.time.beatType}</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>`
          : "";
      return `<measure number="${i + 1}">${attrs}${notes}</measure>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0">
  <work><work-title>${escapeXml(score.title || "Untitled")}</work-title></work>
  <identification><creator type="composer">${escapeXml(score.composer || "")}</creator><encoding><software>Folio</software></encoding></identification>
  <part-list><score-part id="P1"><part-name>${escapeXml(score.instrument)}</part-name></score-part></part-list>
  <part id="P1">
    ${parts}
  </part>
</score-partwise>
`;
}

export function downloadText(filename: string, text: string, mime: string) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
