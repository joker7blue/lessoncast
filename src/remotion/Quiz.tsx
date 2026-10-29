import { AbsoluteFill, Img, useCurrentFrame } from "remotion";
import { QUIZ_LETTERS } from "../lib/lesson/quiz";
import type { VideoProps } from "../lib/video/props";
import { fontFamily } from "./font";
import { HIGHLIGHT_COLOR } from "./Highlights";
import { countdown, fadeOpacity, readingChoice } from "./motion";

type Quiz = NonNullable<VideoProps["quiz"]>;
type Question = Quiz["questions"][number];

const RIGHT = "#22c55e";
const RING = 2 * Math.PI * 34;

function Countdown({ number, progress }: { number: number; progress: number }) {
  return (
    <div style={{ position: "relative", width: 84, height: 84 }}>
      <svg width={84} height={84} style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
        <circle cx={42} cy={42} r={34} fill="rgba(0,0,0,.55)" stroke="rgba(255,255,255,.18)" strokeWidth={6} />
        <circle cx={42} cy={42} r={34} fill="none" stroke={HIGHLIGHT_COLOR} strokeWidth={6} strokeLinecap="round" strokeDasharray={RING} strokeDashoffset={RING * progress} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: 38, fontWeight: 800, color: "white" }}>{number}</div>
    </div>
  );
}

function QuestionView({ question, total, frame }: { question: Question; total: number; frame: number }) {
  const reading = readingChoice(question, frame);
  const timer = countdown(question, frame);
  const revealed = frame >= question.revealFrame;
  return (
    <AbsoluteFill style={{ opacity: fadeOpacity(frame, question.startFrame, Number.POSITIVE_INFINITY, 8), padding: "34px 44px", fontFamily, color: "white" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 24 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: HIGHLIGHT_COLOR, letterSpacing: 0.5 }}>
            Question {question.number}/{total}
          </div>
          <div style={{ marginTop: 8, fontSize: 28, fontWeight: 800, lineHeight: 1.2, textShadow: "0 2px 10px rgba(0,0,0,.5)" }}>{question.text}</div>
        </div>
        <div style={{ width: 84, height: 84, flexShrink: 0 }}>{timer && <Countdown {...timer} />}</div>
      </div>
      <div style={{ marginTop: 26, display: "flex", flexDirection: "column", gap: 12 }}>
        {question.choices.map((choice, i) => {
          const right = i === question.answerIndex;
          const lit = i === reading;
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "10px 16px",
                borderRadius: 14,
                border: `3px solid ${revealed && right ? RIGHT : lit ? HIGHLIGHT_COLOR : "transparent"}`,
                backgroundColor: revealed && right ? "rgba(34,197,94,.28)" : "rgba(0,0,0,.5)",
                opacity: revealed && !right ? 0.4 : 1,
                transform: `scale(${revealed && right ? 1.02 : 1})`,
              }}
            >
              <span
                style={{
                  display: "grid",
                  placeItems: "center",
                  width: 38,
                  height: 38,
                  borderRadius: 999,
                  flexShrink: 0,
                  fontSize: 20,
                  fontWeight: 800,
                  backgroundColor: revealed && right ? RIGHT : lit ? HIGHLIGHT_COLOR : "rgba(255,255,255,.14)",
                  color: (revealed && right) || lit ? "#111" : "white",
                }}
              >
                {revealed && right ? "✓" : QUIZ_LETTERS[i]}
              </span>
              <span style={{ fontSize: 23, fontWeight: 700, lineHeight: 1.2 }}>{choice.text}</span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

/** The quiz after the last scene, over that scene blurred: its title, then each question read by the
 * voice, choice by choice, a 3-2-1 countdown, and the right answer turning green as the voice says it. */
export const QuizCard: React.FC<{ quiz: Quiz; backgroundUrl: string; from: number }> = ({ quiz, backgroundUrl, from }) => {
  const frame = useCurrentFrame() + from;
  const current = quiz.questions.findLast((q) => frame >= q.startFrame);
  return (
    <AbsoluteFill style={{ opacity: fadeOpacity(frame, from, Number.POSITIVE_INFINITY), backgroundColor: "black" }}>
      <Img src={backgroundUrl} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "blur(10px) brightness(0.35)", transform: "scale(1.12)" }} />
      {current ? (
        <QuestionView key={current.number} question={current} total={quiz.questions.length} frame={frame} />
      ) : (
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", fontFamily, color: "white", textAlign: "center" }}>
          <div style={{ display: "grid", placeItems: "center", width: 76, height: 76, borderRadius: 999, backgroundColor: HIGHLIGHT_COLOR, color: "#111", fontSize: 46, fontWeight: 800 }}>?</div>
          <div style={{ marginTop: 18, fontSize: 44, fontWeight: 800 }}>{quiz.title}</div>
          <div style={{ marginTop: 8, fontSize: 22, fontWeight: 700, color: HIGHLIGHT_COLOR }}>{quiz.subtitle}</div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
