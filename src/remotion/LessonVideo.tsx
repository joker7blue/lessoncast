import { AbsoluteFill, Audio, Sequence } from "remotion";
import type { VideoProps } from "../lib/video/props";
import { Captions } from "./Captions";
import { EndCard } from "./EndCard";
import { Scene } from "./Scene";
import { TitleCard } from "./TitleCard";

// Each scene and the end card start this many frames early, fading in over the previous part.
const OVERLAP_FRAMES = 12;

export const LessonVideo: React.FC<VideoProps> = ({ audioUrl, title, scenes, captions, endCard }) => {
  const endFrom = endCard.startFrame - OVERLAP_FRAMES;
  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <Audio src={audioUrl} />
      <Sequence durationInFrames={title.endFrame}>
        <TitleCard title={title} />
      </Sequence>
      {scenes.map((scene, i) => {
        const from = scene.startFrame - OVERLAP_FRAMES;
        return (
          <Sequence key={i} from={from} durationInFrames={scene.endFrame - from}>
            <Scene imageUrl={scene.imageUrl} motion={scene.motion} fadeIn />
          </Sequence>
        );
      })}
      <Captions captions={captions} />
      <Sequence from={endFrom} durationInFrames={endCard.endFrame - endFrom}>
        <EndCard text={endCard.text} />
      </Sequence>
    </AbsoluteFill>
  );
};
