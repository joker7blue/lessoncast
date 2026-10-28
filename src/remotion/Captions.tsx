import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import type { VideoProps } from "../lib/video/props";
import { fontFamily } from "./font";
import { HIGHLIGHT_COLOR } from "./Highlights";
import { activeCaption, activeWordIndex } from "./motion";

/** Karaoke subtitles: the current caption at the bottom, the word being spoken in yellow. A word that
 * names a lit object stays yellow, underlined, while its object is lit. */
export const Captions: React.FC<{ captions: VideoProps["captions"] }> = ({ captions }) => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const caption = activeCaption(captions, frame);
  if (!caption) return null;
  const active = activeWordIndex(caption, frame);
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 22 }}>
      <div
        style={{
          maxWidth: width - 80,
          padding: "6px 16px",
          borderRadius: 12,
          backgroundColor: "rgba(0,0,0,.62)",
          color: "white",
          fontFamily,
          fontSize: 26,
          fontWeight: 700,
          lineHeight: 1.3,
          textAlign: "center",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {caption.words.map((word, i) => {
          const lit = word.litUntilFrame !== undefined && frame >= word.startFrame && frame < word.litUntilFrame;
          return (
            <span key={i}>
              <span
                style={{
                  color: i === active || lit ? HIGHLIGHT_COLOR : "white",
                  textDecoration: lit ? `underline 3px ${HIGHLIGHT_COLOR}` : undefined,
                  textUnderlineOffset: 5,
                }}
              >
                {word.text}
              </span>{" "}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
