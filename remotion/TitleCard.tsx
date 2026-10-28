import { AbsoluteFill, Img, useCurrentFrame, useVideoConfig } from "remotion";
import type { VideoProps } from "../lib/video/props";
import { fontFamily } from "./font";
import { fadeOpacity } from "./motion";

/** The lesson title over scene 1, blurred and darkened, while the voice reads the title. */
export const TitleCard: React.FC<{ title: VideoProps["title"] }> = ({ title }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return (
    <AbsoluteFill style={{ opacity: fadeOpacity(frame, -12, durationInFrames), backgroundColor: "black" }}>
      <Img
        src={title.backgroundUrl}
        style={{ width: "100%", height: "100%", objectFit: "cover", filter: "blur(8px) brightness(0.45)", transform: "scale(1.1)" }}
      />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: "0 56px", textAlign: "center", fontFamily, color: "white" }}>
        <div style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.15, textShadow: "0 2px 12px rgba(0,0,0,.6)" }}>{title.text}</div>
        <div style={{ marginTop: 14, fontSize: 20, fontWeight: 700, color: "#ffd400" }}>
          {title.subject} · {title.level}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
