// The books table: one row per uploaded PDF, from the upload to its list of lessons. A lesson's video
// is a lessons row with book_id set (lib/lessons/repo.ts).

import { z } from "zod";
import type { LessonStatus, StepMetrics } from "../lessons/repo";
import type { Language } from "../lesson/schema";
import type { StyleChoice } from "../lesson/styles";
import { supabase } from "../supabase/server";
import type { BookLesson } from "./schema";

export type BookStatus = "uploading" | "reading" | "ready" | "failed";
/** A slice of the book as stored: its pages in the book and its PDF's storage path. */
export type StoredSlice = { firstPage: number; lastPage: number; path: string };

export type BookRow = {
  id: string;
  createdAt: string;
  status: BookStatus;
  error: string | null;
  fileName: string;
  fileBytes: number;
  pageCount: number | null;
  title: string | null;
  subject: string | null;
  level: string | null;
  /** Lesson n of the book at index n - 1, in page order. */
  lessons: BookLesson[];
  slices: StoredSlice[];
  slicesRead: number;
  metrics: Record<string, StepMetrics>;
  ipHash: string | null;
  triggerRunId: string | null;
};

type Columns = {
  id: string;
  created_at: string;
  status: BookStatus;
  error: string | null;
  file_name: string;
  file_bytes: number;
  page_count: number | null;
  title: string | null;
  subject: string | null;
  level: string | null;
  lessons: BookLesson[];
  slices: StoredSlice[];
  slices_read: number;
  metrics: Record<string, StepMetrics>;
  ip_hash: string | null;
  trigger_run_id: string | null;
};

const PATCH_COLUMNS = {
  status: "status",
  error: "error",
  pageCount: "page_count",
  title: "title",
  subject: "subject",
  level: "level",
  lessons: "lessons",
  slices: "slices",
  metrics: "metrics",
  triggerRunId: "trigger_run_id",
} as const satisfies Partial<Record<keyof BookRow, keyof Columns>>;

export type BookPatch = Partial<Pick<BookRow, keyof typeof PATCH_COLUMNS>>;

function toRow(c: Columns): BookRow {
  return {
    id: c.id,
    createdAt: c.created_at,
    status: c.status,
    error: c.error,
    fileName: c.file_name,
    fileBytes: c.file_bytes,
    pageCount: c.page_count,
    title: c.title,
    subject: c.subject,
    level: c.level,
    lessons: c.lessons,
    slices: c.slices,
    slicesRead: c.slices_read,
    metrics: c.metrics,
    ipHash: c.ip_hash,
    triggerRunId: c.trigger_run_id,
  };
}

function fail(action: string, error: { message: string }): never {
  throw new Error(`Could not ${action}: ${error.message}`);
}

const books = () => supabase().from("books");

export async function createBook({ fileName, fileBytes, ipHash }: { fileName: string; fileBytes: number; ipHash: string | null }): Promise<BookRow> {
  const { data, error } = await books().insert({ file_name: fileName, file_bytes: fileBytes, ip_hash: ipHash }).select().single<Columns>();
  if (error) fail("create a book", error);
  return toRow(data);
}

/** The book, or null when no row has this id (including ids that aren't uuids, from a typed URL). */
export async function getBook(id: string): Promise<BookRow | null> {
  if (!z.uuid().safeParse(id).success) return null;
  const { data, error } = await books().select().eq("id", id).maybeSingle<Columns>();
  if (error) fail(`read book ${id}`, error);
  return data && toRow(data);
}

export async function updateBook(id: string, patch: BookPatch): Promise<void> {
  const columns = Object.fromEntries(Object.entries(patch).map(([key, value]) => [PATCH_COLUMNS[key as keyof BookPatch], value]));
  const { error } = await books().update(columns).eq("id", id);
  if (error) fail(`update book ${id}`, error);
}

/** One more slice read, without touching the count the other slices write. */
export async function countSliceRead(id: string): Promise<void> {
  const { error } = await supabase().rpc("count_slice_read", { book_id: id });
  if (error) fail(`count a slice of book ${id}`, error);
}

/** A video made from one of the book's lessons. */
export type BookVideo = { id: string; bookLesson: number; status: LessonStatus; language: Language; style: StyleChoice; createdAt: string };

/** The videos made from the book, newest first. */
export async function videosOfBook(id: string): Promise<BookVideo[]> {
  const { data, error } = await supabase()
    .from("lessons")
    .select("id, book_lesson, status, language, style, created_at")
    .eq("book_id", id)
    .order("created_at", { ascending: false });
  if (error) fail(`read the videos of book ${id}`, error);
  return (data ?? []).map((v) => ({
    id: v.id as string,
    bookLesson: v.book_lesson as number,
    status: v.status as LessonStatus,
    language: v.language as Language,
    style: v.style as StyleChoice,
    createdAt: v.created_at as string,
  }));
}
