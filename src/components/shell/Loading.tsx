// A page still loading: the logo inside a turning ring, and what is loading under it. The ring stands
// still when the device asks for less motion.

import { LogoMark } from "./Logo";

// A quarter of the ring (2π × 36 ≈ 226) is drawn in yellow.
const RING = 2 * Math.PI * 36;

export function Loading({ label }: { label: string }) {
  return (
    <div role="status" className="flex min-h-[60vh] flex-col items-center justify-center gap-5 text-center">
      <span className="relative grid size-20 place-items-center">
        <svg viewBox="0 0 80 80" aria-hidden className="absolute inset-0 size-20 motion-safe:animate-spin [animation-duration:1.1s]">
          <circle cx="40" cy="40" r="36" fill="none" stroke="var(--color-line)" strokeWidth="4" />
          <circle
            cx="40"
            cy="40"
            r="36"
            fill="none"
            stroke="var(--color-spoken)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`${RING / 4} ${RING}`}
          />
        </svg>
        <LogoMark className="size-11" />
      </span>
      <p className="text-lg font-bold text-dust">{label}</p>
    </div>
  );
}
