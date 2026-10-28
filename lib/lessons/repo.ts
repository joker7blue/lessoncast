// The lessons table: one row per photo, from upload to the finished video.

import { z } from "zod";
import type { Language, Lesson } from "../lesson/schema";
import { supabase } from "../supabase/server";
import type { TimedWord } from "../video/words";

export type LessonStatus = "queued" | "reading" | "drawing" | "voicing" | "highlighting" | "rendering" | "done" | "failed";
export type StepMetrics = { seconds: number; costUsd: number };

export type LessonRow = {
  id: string;
  createdAt: string;
  language: Language;
  status: LessonStatus;
  error: string | null;
  script: Lesson | null;
  /** Storage path of scene n at index n - 1, null until that image arrives. */
  scenePaths: (string | null)[];
  audioPath: string | null;
  videoPath: string | null;
  words: TimedWord[] | null;
  metrics: Record<string, StepMetrics>;
  ipHash: string | null;
  triggerRunId: string | null;
};

type Columns = {
  id: string;
  created_at: string;
  language: Language;
  status: LessonStatus;
  error: string | null;
  script: Lesson | null;
  scene_paths: (string | null)[];
  audio_path: string | null;
  video_path: string | null;
  words: TimedWord[] | null;
  metrics: Record<string, StepMetrics>;
  ip_hash: string | null;
  trigger_run_id: string | null;
};

const PATCH_COLUMNS = {
  status: "status",
  error: "error",
  script: "script",
  audioPath: "audio_path",
  videoPath: "video_path",
  words: "words",
  triggerRunId: "trigger_run_id",
} as const satisfies Partial<Record<keyof LessonRow, keyof Columns>>;

export type LessonPatch = Partial<Pick<LessonRow, keyof typeof PATCH_COLUMNS>>;

function toRow(c: Columns): LessonRow {
  return {
    id: c.id,
    createdAt: c.created_at,
    language: c.language,
    status: c.status,
    error: c.error,
    script: c.script,
    scenePaths: c.scene_paths,
    audioPath: c.audio_path,
    videoPath: c.video_path,
    words: c.words,
    metrics: c.metrics,
    ipHash: c.ip_hash,
    triggerRunId: c.trigger_run_id,
  };
}

function fail(action: string, error: { message: string }): never {
  throw new Error(`Could not ${action}: ${error.message}`);
}

const lessons = () => supabase().from("lessons");

export async function createLesson({ language, ipHash }: { language: Language; ipHash: string | null }): Promise<LessonRow> {
  const { data, error } = await lessons().insert({ language, ip_hash: ipHash }).select().single<Columns>();
  if (error) fail("create a lesson", error);
  return toRow(data);
}

/** The lesson, or null when no row has this id (including ids that aren't uuids, from a typed URL). */
export async function getLesson(id: string): Promise<LessonRow | null> {
  if (!z.uuid().safeParse(id).success) return null;
  const { data, error } = await lessons().select().eq("id", id).maybeSingle<Columns>();
  if (error) fail(`read lesson ${id}`, error);
  return data && toRow(data);
}

export async function updateLesson(id: string, patch: LessonPatch): Promise<void> {
  const columns = Object.fromEntries(
    Object.entries(patch).map(([key, value]) => [PATCH_COLUMNS[key as keyof LessonPatch], value]),
  );
  const { error } = await lessons().update(columns).eq("id", id);
  if (error) fail(`update lesson ${id}`, error);
}

/** Records scene n's image (n starts at 1) without touching the other scenes. */
export async function setScenePath(id: string, n: number, path: string): Promise<void> {
  const { error } = await supabase().rpc("set_scene_path", { lesson_id: id, n, path });
  if (error) fail(`record scene ${n} of lesson ${id}`, error);
}

/** Records one pipeline step's duration and estimated cost without touching the other steps. */
export async function recordMetrics(id: string, step: string, m: StepMetrics): Promise<void> {
  const { error } = await supabase().rpc("record_metrics", { lesson_id: id, step, m });
  if (error) fail(`record metrics of lesson ${id}`, error);
}
