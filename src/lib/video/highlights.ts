// The objects SAM 3.1 found in each scene, as find-highlights stores them in <id>/highlights.json and
// the render reads them back. Both phrases are kept, so either language renders from the same file.

import { z } from "zod";
import { LANGUAGE_CODES, type LanguageCode } from "../lesson/languages";

/** One SAM mask outline, `d` in the mask raster's pixels, placed on the image by
 * `translate(left top) scale(scaleX scaleY)`. */
export const Shape = z.object({
  d: z.string().min(1),
  left: z.number(),
  top: z.number(),
  scaleX: z.number().positive(),
  scaleY: z.number().positive(),
  confidence: z.number().nullable(),
});
export type Shape = z.infer<typeof Shape>;

/** The phrase that names the object, in each language the script was written in. */
const phrases = Object.fromEntries(LANGUAGE_CODES.map((l) => [l, z.string().optional()])) as { [L in LanguageCode]: z.ZodOptional<z.ZodString> };

export const FoundObject = z.object({
  samPrompt: z.string(),
  ...phrases,
  shapes: z.array(Shape).min(1),
});
export type FoundObject = z.infer<typeof FoundObject>;

export const SceneHighlights = z.object({
  imageWidth: z.int().positive(),
  imageHeight: z.int().positive(),
  objects: z.array(FoundObject),
});
export type SceneHighlights = z.infer<typeof SceneHighlights>;

type Point = { x: number; y: number; text: string };

// In mask pixels: a mask is at most 1024 px a side and the video 854 px wide, so the outline moves
// by half a video pixel at most.
const TOLERANCE = 0.6;

function distanceToLine(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy);
  if (length === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  return Math.abs(dx * (p.y - a.y) - dy * (p.x - a.x)) / length;
}

/** Ramer–Douglas–Peucker: marks the points of points[from..to] that the outline needs. */
function keepPoints(points: Point[], from: number, to: number, keep: boolean[]): void {
  let farthest = -1;
  let max = TOLERANCE;
  for (let i = from + 1; i < to; i++) {
    const distance = distanceToLine(points[i]!, points[from]!, points[to]!);
    if (distance > max) {
      max = distance;
      farthest = i;
    }
  }
  if (farthest === -1) return;
  keep[farthest] = true;
  keepPoints(points, from, farthest, keep);
  keepPoints(points, farthest, to, keep);
}

/** A SAM outline has a point at every pixel, half-pixel steps along its slopes. This keeps only the
 * points the shape needs, within TOLERANCE, with the coordinates as SAM wrote them. */
export function simplifyPath(d: string): string {
  const subpaths: { points: Point[]; closed: boolean }[] = [];
  for (const [, command, args] of d.matchAll(/([MLZ])([^MLZ]*)/gi)) {
    const c = command!.toUpperCase();
    if (c === "Z") {
      if (subpaths.length) subpaths.at(-1)!.closed = true;
      continue;
    }
    const [x, y] = args!.trim().split(/[\s,]+/);
    const point = { x: Number(x), y: Number(y), text: `${x} ${y}` };
    if (c === "M") subpaths.push({ points: [point], closed: false });
    else subpaths.at(-1)?.points.push(point);
  }

  return subpaths
    .map(({ points, closed }) => {
      const keep = points.map((_, i) => i === 0 || i === points.length - 1);
      keepPoints(points, 0, points.length - 1, keep);
      const kept = points.filter((_, i) => keep[i]);
      return kept.map((p, i) => `${i === 0 ? "M" : "L"}${p.text}`).join("") + (closed ? "Z" : "");
    })
    .join("");
}

/** The centre of the shapes' bounding box on the image, the point a lit cut-out grows from. */
export function shapesCenter(shapes: Shape[]): { x: number; y: number } {
  let [left, top, right, bottom] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const shape of shapes) {
    for (const [, x, y] of shape.d.matchAll(/[ML]\s*(-?[\d.]+)[\s,]+(-?[\d.]+)/gi)) {
      const px = shape.left + Number(x) * shape.scaleX;
      const py = shape.top + Number(y) * shape.scaleY;
      [left, top, right, bottom] = [Math.min(left, px), Math.min(top, py), Math.max(right, px), Math.max(bottom, py)];
    }
  }
  return { x: (left + right) / 2, y: (top + bottom) / 2 };
}
