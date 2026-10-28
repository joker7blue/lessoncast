import { AbsoluteFill, useCurrentFrame } from "remotion";
import { fontFamily } from "./font";
import { fadeOpacity } from "./motion";

/** "Watch this lesson again tonight with your parents", in the lesson's language. */
export const EndCard: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        opacity: fadeOpacity(frame, 0, Number.POSITIVE_INFINITY),
        backgroundColor: "#111",
        justifyContent: "center",
        alignItems: "center",
        padding: "0 64px",
        textAlign: "center",
        fontFamily,
        color: "white",
      }}
    >
      <div style={{ fontSize: 34, fontWeight: 800, lineHeight: 1.2 }}>{text}</div>
      <div style={{ marginTop: 18, fontSize: 18, fontWeight: 700, color: "#ffd400", letterSpacing: 1 }}>LessonCast</div>
    </AbsoluteFill>
  );
};
