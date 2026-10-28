import { AbsoluteFill, Img, useCurrentFrame, useVideoConfig } from "remotion";
import type { Motion } from "../lib/video/props";
import { fadeOpacity, motionTransform } from "./motion";

/** A full-frame scene image with its slow camera motion; fades in when it overlaps the previous part. */
export const Scene: React.FC<{ imageUrl: string; motion: Motion; fadeIn: boolean }> = ({ imageUrl, motion, fadeIn }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return (
    <AbsoluteFill style={{ opacity: fadeIn ? fadeOpacity(frame, 0, Number.POSITIVE_INFINITY) : 1, overflow: "hidden" }}>
      <Img
        src={imageUrl}
        style={{ width: "100%", height: "100%", objectFit: "cover", transform: motionTransform(motion, frame / durationInFrames) }}
      />
    </AbsoluteFill>
  );
};
