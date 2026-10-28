import { AbsoluteFill, Img, useCurrentFrame, useVideoConfig } from "remotion";
import type { Motion, VideoProps } from "../lib/video/props";
import { SceneOverlay } from "./Highlights";
import { fadeOpacity, motionTransform } from "./motion";

type Overlay = VideoProps["scenes"][number]["overlay"];

/** A full-frame scene image with its slow camera motion; fades in when it overlaps the previous part.
 * The SAM highlights sit inside the moving frame, so a cut-out stays on its object. `from` is the
 * scene's first frame in the video, as its highlights are placed in video frames. */
export const Scene: React.FC<{ imageUrl: string; motion: Motion; fadeIn: boolean; overlay?: Overlay; from?: number }> = ({
  imageUrl,
  motion,
  fadeIn,
  overlay,
  from = 0,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return (
    <AbsoluteFill style={{ opacity: fadeIn ? fadeOpacity(frame, 0, Number.POSITIVE_INFINITY) : 1, overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: motionTransform(motion, frame / durationInFrames) }}>
        <Img src={imageUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        {overlay && <SceneOverlay overlay={overlay} imageUrl={imageUrl} frame={from + frame} />}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
