# LessonCast

A teacher in Cameroon photographs one to four pages of a textbook and gets back a two-to-three-minute
narrated, illustrated video lesson in French or Pidgin, small enough to share in the parents' WhatsApp group.

Many Cameroonian children learn in French or English, a language they don't speak at home, in crowded
classes with few textbooks and expensive mobile data. A short video in the language of home, which a parent
can replay with the child in the evening, helps where a printed page doesn't.

## Meta models at every step

| Step | Model | What it does |
|---|---|---|
| Write the lesson | **Muse Spark** `muse-spark-1.3`, Meta Model API | Reads the photographed pages in one request, checks they are textbook pages, and writes the lesson as strict JSON: seven scenes, the narration in French and Pidgin, an image prompt per scene, the objects each scene names, a three-question quiz. In *Automatic* it also picks the picture style from the level and the subject. |
| Draw the scenes | **Muse Image** `muse-image-1.0`, Meta Model API | Draws scene 1 from a fixed style prompt (Illustrated, Realistic, Diagram or Comic), then every other scene as an edit of scene 1, so the characters stay the same. |
| Speak | **MMS-TTS** `facebook/mms-tts-fra`, `facebook/mms-tts-pcm`, open weights on Modal | Reads the narration aloud. |
| Time every word | **MMS forced alignment** (torchaudio `MMS_FA`), open weights on Modal | Gives each word its start and end: the karaoke subtitles and the length of every scene. |
| Cut out the objects | **SAM 3.1** `sam-3.1`, Meta Model API | Finds each object a scene's narration names ("the heart", "the map") in its drawing and returns its outline. When the voice says the word, the rest of the scene dims and the object lifts, outlined in yellow, with its word underlined in the subtitles. An object SAM can't find is left out; SAM never fails a lesson. |
| Edit the video | Remotion 4, on Modal | Title card, scenes with slow zooms and crossfades, the SAM cut-outs lit on their words, subtitles that light up the spoken word, end card. 854 × 480 H.264 at 300 kbit/s. |

Coming next: the quiz is narrated at the end of the video.

## What a lesson costs

Measured on real lessons made from one page: about four minutes from upload to video, up to about five and a
half when two lessons run at once, about $0.15 of model calls ($0.05 for Muse Spark, $0.07 for seven Muse Image scenes, about 3 cents
for SAM 3.1 on 13 objects in 31 s, about a cent each for the voice and the render), and about 6 MB for two and a half minutes of video. Every lesson page shows its
own times and costs as a live graph of the pipeline. The derisk tests that set these choices are in
[`docs/derisk.md`](docs/derisk.md).

## Architecture

```
Browser (teacher or judge)
  │ 1 to 4 page photos, each shrunk in the browser to a JPEG of at most 1600 px,
  │ language fr | pcm, style auto | illustrated | realistic | diagram | comic
  ▼
Next.js 16
  │ POST /api/lessons      checks → pages to Supabase Storage → lessons row → trigger generate-lesson
  │ GET  /api/lessons/:id  status, scenes drawn so far, each step's metrics, the video (polled every 2 s)
  ▼
Trigger.dev
  generate-lesson ─┬─ write-script      Muse Spark → lesson (Zod); warms the voice
                   ├─ draw-scenes  ┐    Muse Image: scene 1, then the others as edits of it, 4 at a time
                   │  narrate      ┘    Modal lessoncast-voice: MMS-TTS + MMS_FA → WAV + word timings
                   ├─ find-highlights   SAM 3.1: one request per named object → highlights.json
                   └─ render-video      Modal lessoncast-render: Remotion → MP4
  ▼
Supabase: the lessons table (RLS on, server only) and the public "lessons" bucket
```

Each step is a child task with its own retries; waiting on children is not billed. Modal never holds the
Supabase keys: it uploads through signed URLs.

```
src/app          the site: landing, /create, /lessons, /lessons/[id], How it works, Why LessonCast, the API
src/lib          lesson schema and styles, the pipeline's logic, Meta Model API and Modal clients, Supabase
src/remotion     the LessonVideo composition
src/trigger      the Trigger.dev tasks
modal/           voice.py (MMS) and render.py (Remotion), deployed to Modal
supabase/        database migrations
scripts/         smoke test, run a lesson without the site, record the Remotion fixture, derisk tests
```

## Run it locally

You need Node 22 or later, pnpm 10, Python 3.12, and accounts on the Meta Model API, Supabase, Trigger.dev and
Modal.

1. Install: `pnpm install`.
2. Copy `.env.example` to `.env` and fill it in. The file lists every variable.
3. Create the database: run each file of `supabase/migrations/` in order with
   `psql "$SUPABASE_DB_URL" -f <file>` (use the Session pooler address).
4. Deploy the Modal apps:
   ```bash
   python3 -m venv scripts/derisk/.venv
   scripts/derisk/.venv/bin/pip install -r scripts/derisk/requirements.txt
   scripts/derisk/.venv/bin/modal setup
   scripts/derisk/.venv/bin/modal deploy modal/voice.py
   scripts/derisk/.venv/bin/modal deploy modal/render.py
   ```
5. Set your Trigger.dev project ref in `trigger.config.ts`, then run the site and the worker side by side:
   `pnpm dev` and `pnpm trigger:dev`.
6. Open http://localhost:3000, or check the whole pipeline from the terminal:
   `pnpm smoke pcm auto page.jpg`.

Tests: `pnpm test` (the tests that call Supabase and Modal run when `.env` has their keys and skip otherwise),
`pnpm typecheck`, `pnpm lint`, and for the Modal helpers
`scripts/derisk/.venv/bin/python -m unittest discover -s modal`.

## Built during the Meta Global AI Developer Hackathon (26 October – 4 November 2026)

Everything in this repository was written during the event, starting from an empty `create-next-app` on
26 October: first the derisk tests, then the pipeline, then the site. The commit history and the pull
requests show each step.

## Licenses

The code is under the [MIT license](LICENSE). The MMS-TTS voices are released by Meta under CC-BY-NC 4.0, for
non-commercial use. Muse Spark, Muse Image and SAM 3.1 are used through the Meta Model API under its terms. Remotion has
its own license, free for individuals and small teams. Nunito is under the SIL Open Font License.
