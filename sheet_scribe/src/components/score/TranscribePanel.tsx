import { useRef, useState } from "react";
import { Mic, Square, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { decodeFile, transcribeBuffer } from "@/lib/music/transcribe";
import { useEditor } from "@/lib/store";

export function TranscribePanel() {
  const open = useEditor((s) => s.transcribeOpen);
  const setOpen = useEditor((s) => s.setTranscribeOpen);
  const score = useEditor((s) => s.score);
  const appendNotes = useEditor((s) => s.appendNotes);
  const [status, setStatus] = useState("");
  const [recording, setRecording] = useState(false);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  if (!open) return null;

  const ingestBuffer = async (buffer: AudioBuffer) => {
    setStatus("Reading pitch…");
    const notes = transcribeBuffer(buffer, {
      tempo: score.tempo,
      time: score.time,
      fifths: score.fifths,
    });
    if (!notes.length) {
      setStatus("No clear pitches. Try a quieter room and a single violin line.");
      return;
    }
    appendNotes(notes);
    setStatus(`Placed ${notes.length} notes on the page. Tidy pitches and rhythm as needed.`);
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setStatus("Decoding audio…");
    try {
      const buf = await decodeFile(file);
      await ingestBuffer(buf);
    } catch {
      setStatus("Could not read that file.");
    }
  };

  const toggleRecord = async () => {
    if (recording) {
      recRef.current?.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunks.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size) chunks.current.push(e.data);
      };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks.current, { type: rec.mimeType || "audio/webm" });
        const file = new File([blob], "take.webm");
        await onFile(file);
      };
      recRef.current = rec;
      rec.start();
      setRecording(true);
      setStatus("Listening… play a phrase, then stop.");
    } catch {
      setStatus("Microphone permission is needed, or upload a recording instead.");
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 p-3 sm:items-center">
      <div
        role="dialog"
        aria-labelledby="hear-title"
        className="w-full max-w-md rounded-xl border border-border bg-chrome p-5 shadow-lift"
      >
        <h2 id="hear-title" className="font-display text-xl text-fg">
          Hear a phrase
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Record or upload a single violin line. Folio sketches pitches onto the page as a starting
          point — expect to correct rhythm and accidentals.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={toggleRecord} variant={recording ? "danger" : "default"}>
            {recording ? <Square /> : <Mic />}
            {recording ? "Stop" : "Record"}
          </Button>
          <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-border bg-raised px-3 text-sm font-medium text-fg">
            <Upload className="size-4" />
            Upload
            <input
              type="file"
              accept="audio/*,.wav,.mp3,.m4a,.ogg"
              className="sr-only"
              onChange={(e) => void onFile(e.target.files?.[0])}
            />
          </label>
        </div>
        {status ? <p className="mt-3 text-sm text-muted">{status}</p> : null}
        <div className="mt-5 flex justify-end">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
