"use client";

// Where a lesson's pages come from: photographed by the teacher, or a whole textbook or ebook as a PDF,
// which Muse Spark splits into lessons first.

import { Camera, FileText } from "lucide-react";
import { useState } from "react";
import { BookUploadForm } from "./BookUploadForm";
import { UploadForm } from "./UploadForm";

type Source = "photos" | "book";

const SOURCES: { value: Source; label: string; icon: typeof Camera }[] = [
  { value: "photos", label: "Photograph pages", icon: Camera },
  { value: "book", label: "Upload a PDF book", icon: FileText },
];

export function CreateForm() {
  const [source, setSource] = useState<Source>("photos");
  return (
    <>
      <div role="radiogroup" aria-label="Where the pages come from" className="mt-8 grid max-w-lg grid-cols-2 gap-2 rounded-lg bg-panel p-1">
        {SOURCES.map(({ value, label, icon: Icon }) => (
          <label
            key={value}
            className={`flex cursor-pointer items-center justify-center gap-2 rounded-md py-2.5 font-bold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-spoken ${source === value ? "bg-chalk text-board" : "text-dust hover:text-chalk"}`}
          >
            <input type="radio" name="source" value={value} checked={source === value} onChange={() => setSource(value)} className="sr-only" />
            <Icon aria-hidden className="size-4" strokeWidth={2.5} />
            {label}
          </label>
        ))}
      </div>
      {source === "photos" ? <UploadForm /> : <BookUploadForm />}
    </>
  );
}
