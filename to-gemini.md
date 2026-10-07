The plan, as written by myself and grok


**Got it.** Priorities are clear:

- Fully local / private (no external network calls except your own server)
- Free & open-source only
- Highest priority = accurate, legitimate, printable sheet music that can look either stylized (parchment) or professional
- Single staff is fine
- Audio transcription is a “strong starting point that needs cleanup,” not real-time

Here’s a practical, realistic stack and plan that matches those constraints.

### Recommended Core Stack (all free/open, fully local)

| Layer | Technology | License | Why it fits |
|-------|------------|---------|-------------|
| Score data model | **MusicXML** | Open standard | Industry interchange format. Accurate, future-proof, works with almost everything. |
| Interactive editor + live preview (React/TS) | **OpenSheetMusicDisplay (OSMD)** + VexFlow underneath | BSD-3-Clause | Best balance of quality, MusicXML support, React friendliness, and customization. Actively maintained. Renders to clean SVG. |
| High-quality printable PDF / professional engraving | **MuseScore** (headless CLI) on your Python server | GPLv3 | Produces excellent, readable print-ready PDFs from MusicXML. Run it locally with `mscore -o output.pdf input.musicxml`. |
| Alternative high-quality renderer | **Verovio** | LGPLv3 | Extremely clean engraving (SVG). Requires attribution. Good complement or alternative if you want pure SVG pipeline. |
| Audio → notes | **Basic Pitch** (Spotify) | Apache-2.0 | Lightweight, fully local (Python + optional TS), works well on violin, supports simple polyphony/double stops. Perfect “starting point” tool. |
| Playback | **Tone.js** (browser) or FluidSynth + SoundFont (Python) | MIT / LGPL | Reliable local playback of the current bar / whole piece. |
| Custom look | CSS + SVG overrides + parchment textures | — | Fully under your control. |

All of these run 100% offline on your machine/server.

### Why this combination for your main goal

The most important requirement is **accurate + printable** sheet music.

- OSMD gives you a solid interactive canvas in React where your family can enter/edit notes, see the parchment aesthetic live, and get a clean SVG view.
- When they want a proper printed page, you send the MusicXML to MuseScore’s command-line tool on the Python side. MuseScore is one of the best free engravers available and produces professional-looking, readable PDFs.
- You can also offer a “stylized” export that just high-DPI-captures the parchment-themed SVG view for a more artistic look.

This hybrid approach is much more reliable than trying to build a full professional engraver yourself.

### Aesthetic (parchment + classical)

Very doable:

- Background: a few high-quality parchment textures (seamless or with rough edges via CSS `mask` / SVG clip). Apply as CSS background or as an under-layer in the SVG.
- Themes: store theme objects (background image, staff-line color/opacity, note color, accidental style, text font, etc.).
- Fonts: use free SMuFL music fonts (Bravura is the modern standard and free) + classical text fonts (EB Garamond, Crimson, etc.).
- Custom symbols: OSMD/VexFlow let you override glyphs. You only need to create the ones that matter most for violin (or keep the standard ones and just recolor/restyle).

You can keep almost everything programmatic. Only the parchment images and any highly custom noteheads need art (which you said you’re willing to generate).

### Audio Transcription Path (secondary but loved)

Since real-time isn’t required and “good starting point” is acceptable:

1. User records a phrase (or uploads a file) in the browser.
2. Audio goes to your local Python backend.
3. **Basic Pitch** converts it → MIDI (with pitch bends).
4. You convert the MIDI notes into MusicXML measures (with simple quantization to the current time signature/tempo the user set).
5. The resulting notes appear in the OSMD editor for easy cleanup.

Basic Pitch is deliberately lightweight and runs fine on ordinary hardware. Violin is one of the better instruments for it. Expect to correct some rhythms, accidentals, and any double-stop issues — that’s normal and expected.

You can later experiment with your local AI models on top of (or instead of) Basic Pitch, but start with Basic Pitch because it already works well offline and is purpose-built for this.

### Suggested Build Order (keeps risk low)

**Phase 1 – Solid, printable editor (highest priority)**
- MusicXML as the source of truth
- OSMD in React for display + basic interactive editing (add/delete/move notes, change duration, key/time signatures, barlines, etc.)
- Parchment themes
- Playback of selection / whole piece
- Export: high-DPI image of the current view + MusicXML → MuseScore CLI → professional PDF

**Phase 2 – Make editing pleasant**
- Keyboard shortcuts, mouse placement, simple palette
- Easy measure navigation, copy/paste, undo
- Violin-friendly defaults (treble clef, sensible pitch range, common articulations)

**Phase 3 – Audio assist**
- Record → Basic Pitch → editable MusicXML notes
- Simple cleanup tools (quantize, fix accidentals, split/merge notes)

**Phase 4 – Polish**
- More articulations, fingerings, bowings
- Better sample-based violin playback
- Custom glyph library if desired
- Guitar/piano later if wanted
