"use client";

// The teacher picks a textbook or ebook PDF. It goes straight to storage through a signed URL (with
// its progress), then Muse Spark starts reading it, and the teacher lands on the book page. No video
// is made here: each lesson's video is made from the book page, when the teacher asks for it.

import { FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Step } from "@/components/LessonOptions";
import { rememberBook, rememberBookEditKey } from "@/lib/lessons/remembered";

const MAX_BYTES = 50 * 1024 * 1024;
const OFFLINE = "Sending failed. Check the internet connection and try again.";

type Phase = { kind: "idle" } | { kind: "uploading"; percent: number } | { kind: "starting" };

function fileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}

/** PUTs the file to the signed URL, reporting the share sent. */
function upload(url: string, file: File, onProgress: (percent: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", "application/pdf");
    xhr.setRequestHeader("x-upsert", "true");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(OFFLINE)));
    xhr.onerror = () => reject(new Error(OFFLINE));
    xhr.send(file);
  });
}

async function postJson(url: string, body?: unknown): Promise<{ id?: string; uploadUrl?: string; editKey?: string }> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const answer = (await res.json().catch(() => ({}))) as { id?: string; uploadUrl?: string; editKey?: string; error?: string };
  if (!res.ok) throw new Error(answer.error ?? OFFLINE);
  return answer;
}

export function BookUploadForm() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [error, setError] = useState<string | null>(null);
  const busy = phase.kind !== "idle";

  function choose(chosen: File | undefined) {
    if (input.current) input.current.value = "";
    if (!chosen) return;
    setError(null);
    if (chosen.type !== "application/pdf" && !/\.pdf$/i.test(chosen.name)) return setError("Choose a PDF file.");
    if (chosen.size > MAX_BYTES) return setError("This PDF is over 50 MB. Upload one part of the book.");
    setFile(chosen);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || busy) return;
    setError(null);
    try {
      setPhase({ kind: "uploading", percent: 0 });
      const { id, uploadUrl, editKey } = await postJson("/api/books", { fileName: file.name, bytes: file.size });
      if (!id || !uploadUrl) throw new Error(OFFLINE);
      if (editKey) rememberBookEditKey(id, editKey);
      await upload(uploadUrl, file, (percent) => setPhase({ kind: "uploading", percent }));
      setPhase({ kind: "starting" });
      await postJson(`/api/books/${id}/read`);
      rememberBook(id);
      router.push(`/books/${id}`);
    } catch (e) {
      setError(e instanceof Error && e.message !== "Failed to fetch" ? e.message : OFFLINE);
      setPhase({ kind: "idle" });
    }
  }

  return (
    <form onSubmit={submit} className="mt-10 space-y-12">
      <Step n={1} title="Textbook or ebook" hint="A PDF of up to 50 MB and 400 pages, typed or scanned.">
        {file ? (
          <div className="flex items-center gap-4 rounded-xl border border-line bg-panel p-4">
            <FileText aria-hidden className="size-10 shrink-0 text-spoken" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{file.name}</p>
              <p className="text-sm text-dust">{fileSize(file.size)}</p>
            </div>
            {!busy && (
              <button type="button" onClick={() => setFile(null)} aria-label="Remove the PDF" className="grid size-9 place-items-center rounded-md text-xl font-bold hover:bg-board">
                ×
              </button>
            )}
          </div>
        ) : (
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line px-6 py-12 text-center transition-colors hover:border-spoken has-[:focus-visible]:border-spoken">
            <FileText aria-hidden className="size-9 text-spoken" />
            <span className="font-bold">Choose a PDF</span>
            <span className="text-sm text-dust">Muse Spark reads the whole book and splits it into its lessons.</span>
            <input ref={input} type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(e) => choose(e.target.files?.[0])} />
          </label>
        )}
      </Step>

      <div>
        {error && (
          <p role="alert" className="mb-4 rounded-lg border border-danger/40 px-4 py-3 text-danger">
            {error}
          </p>
        )}
        {phase.kind === "uploading" && (
          <div className="mb-4" aria-live="polite">
            <div className="h-2 overflow-hidden rounded-full bg-panel">
              <div className="h-full rounded-full bg-spoken transition-[width]" style={{ width: `${phase.percent}%` }} />
            </div>
            <p className="mt-2 text-sm text-dust">Uploading the PDF: {phase.percent}%</p>
          </div>
        )}
        <button
          type="submit"
          disabled={!file || busy}
          className="w-full rounded-lg bg-spoken py-4 text-lg font-extrabold text-board transition-opacity disabled:opacity-40"
        >
          {phase.kind === "uploading" ? "Uploading the book…" : phase.kind === "starting" ? "Starting the reading…" : "Read the book"}
        </button>
        <p className="mt-3 text-center text-dust">A whole book takes a few minutes to read. No video is made until you pick a lesson.</p>
      </div>
    </form>
  );
}
