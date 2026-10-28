import { Composition } from "remotion";
import { FPS, HEIGHT, VideoProps, WIDTH } from "../lib/video/props";
import { fixtureProps } from "./fixture";
import { LessonVideo } from "./LessonVideo";

export const Root: React.FC = () => (
  <Composition
    id="LessonVideo"
    component={LessonVideo}
    schema={VideoProps}
    defaultProps={fixtureProps}
    durationInFrames={fixtureProps.durationInFrames}
    fps={FPS}
    width={WIDTH}
    height={HEIGHT}
    calculateMetadata={({ props }) => ({ durationInFrames: props.durationInFrames, fps: FPS, width: WIDTH, height: HEIGHT })}
  />
);
