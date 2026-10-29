// A book as a card, linking to its list of lessons.

import { BookOpen } from "lucide-react";
import Link from "next/link";

export function BookCard({ id, title, note }: { id: string; title: string; note: string }) {
  return (
    <Link href={`/books/${id}`} className="flex items-start gap-3 rounded-xl border border-line bg-panel p-4 hover:border-dust">
      <BookOpen aria-hidden className="mt-0.5 size-5 shrink-0 text-spoken" />
      <span className="min-w-0">
        <span className="block truncate font-extrabold">{title}</span>
        <span className="block text-sm text-dust">{note}</span>
      </span>
    </Link>
  );
}
