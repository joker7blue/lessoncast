import { useId } from "react";
import { AbsoluteFill, Img, useVideoConfig } from "remotion";
import { type Shape, shapesCenter } from "../lib/video/highlights";
import type { VideoProps } from "../lib/video/props";
import { coverFit, highlightLevel } from "./motion";

type Overlay = NonNullable<VideoProps["scenes"][number]["overlay"]>;
type Fit = ReturnType<typeof coverFit>;

const DIM = 0.5;
const LIFT = 0.05;
export const HIGHLIGHT_COLOR = "#ffd400";

/** A shape's outline in frame pixels: the image's cover fit, then the mask stretched over its box. */
const placed = (fit: Fit, s: Shape) => `translate(${fit.x} ${fit.y}) scale(${fit.scale}) translate(${s.left} ${s.top}) scale(${s.scaleX} ${s.scaleY})`;

/** One object SAM cut out, lifted off the scene with a yellow outline. The cut-out is a second copy
 * of the scene image clipped to the mask, so Remotion waits for it like any image. */
const LitObject: React.FC<{ shapes: Shape[]; imageUrl: string; fit: Fit; level: number }> = ({ shapes, imageUrl, fit, level }) => {
  const id = `lit${useId().replace(/[^\w-]/g, "")}`;
  const { width, height } = useVideoConfig();
  const center = shapesCenter(shapes);
  const paths = shapes.map((s, i) => <path key={i} d={s.d} transform={placed(fit, s)} vectorEffect="non-scaling-stroke" />);
  return (
    <AbsoluteFill
      style={{
        transform: `scale(${1 + LIFT * level})`,
        transformOrigin: `${fit.x + center.x * fit.scale}px ${fit.y + center.y * fit.scale}px`,
        filter: `drop-shadow(0 4px 10px rgba(0,0,0,${0.6 * level}))`,
      }}
    >
      <svg width={0} height={0} style={{ position: "absolute" }}>
        <defs>
          <clipPath id={id} clipPathUnits="userSpaceOnUse">
            {paths}
          </clipPath>
        </defs>
      </svg>
      <Img src={imageUrl} style={{ width: "100%", height: "100%", objectFit: "cover", clipPath: `url(#${id})` }} />
      <svg width={width} height={height} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <g fill="none" strokeLinejoin="round" opacity={level}>
          <g stroke={HIGHLIGHT_COLOR} strokeWidth={9} strokeOpacity={0.3}>
            {paths}
          </g>
          <g stroke={HIGHLIGHT_COLOR} strokeWidth={3}>
            {paths}
          </g>
        </g>
      </svg>
    </AbsoluteFill>
  );
};

/** The scene's highlights at `frame` (absolute): the rest of the image dims while an object is lit. */
export const SceneOverlay: React.FC<{ overlay: Overlay; imageUrl: string; frame: number }> = ({ overlay, imageUrl, frame }) => {
  const { width, height } = useVideoConfig();
  const lit = overlay.highlights
    .map((h) => ({ shapes: h.shapes, level: highlightLevel(frame, h.startFrame, h.endFrame) }))
    .filter((h) => h.level > 0);
  if (lit.length === 0) return null;
  const fit = coverFit({ width, height }, overlay);
  return (
    <>
      <AbsoluteFill style={{ backgroundColor: "black", opacity: DIM * Math.max(...lit.map((h) => h.level)) }} />
      {lit.map((h, i) => (
        <LitObject key={i} shapes={h.shapes} imageUrl={imageUrl} fit={fit} level={h.level} />
      ))}
    </>
  );
};
