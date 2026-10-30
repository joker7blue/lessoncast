// A textbook page with a play button cut into it, in the yellow of the spoken word: the same in both themes.

export function LogoMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={className}>
      <rect width="32" height="32" rx="8" fill="#ffd400" />
      <path d="M9 6.5h10l4.5 4.5v14.5H9z" fill="#141b18" />
      <path d="M19 6.5v4.5h4.5" fill="none" stroke="#ffd400" strokeWidth="1.2" />
      <path d="M14 13.2v7.6l6-3.8z" fill="#ffd400" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className="text-lg font-extrabold tracking-tight">LessonCast</span>
    </span>
  );
}
