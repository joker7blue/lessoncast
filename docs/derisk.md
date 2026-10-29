# Derisk tests

Before building the app, each model the pipeline relies on is tested on its own, with a small script in
`scripts/derisk/`. For each test: what worked, latency, cost, and a go / no-go.

Status on 28 October 2026: all five tests done. Every part of the pipeline is a go; the changes they
call for are listed under [Next: the full pipeline](#next-the-full-pipeline).

| # | Model | Script | Result |
|---|---|---|---|
| 0 | Meta Model API access | (curl) | ✅ go |
| 1 | Muse Spark: page photo → lesson JSON | `01-muse-spark.mts` | ✅ go (lesson too short: prompt fix) |
| 2 | Muse Image: 6 scenes, one style | `02-muse-image.mts` | ✅ go, with a reference image |
| 3 | SAM 3.1: named object → mask | `03-sam.mts` | ✅ go (7/11 found: prompt fix + fallback) |
| 4 | MMS-TTS: French + Pidgin voices | `voice_modal.py` | ✅ go |
| 5 | MMS forced alignment: word timestamps | `voice_modal.py` | ✅ go |
| 6 | Remotion render on Modal (no Lambda) | spike, not kept | ✅ go |
| 7 | Muse Spark: a textbook PDF → its lessons | `07-spark-pdf.mts` | ✅ go (30-page slices) |

## How to run

```bash
pnpm derisk:1 scripts/derisk/input/<page>.jpg   # Muse Spark, writes out/01/lesson.json
pnpm derisk:2                                   # Muse Image, reads out/01, writes out/02/contact-sheet.html
pnpm derisk:3                                   # SAM 3.1, reads out/01 + out/02, writes out/03/index.html
pnpm derisk:7 [--scan-only]                     # Muse Spark on a PDF book, writes out/07/answer.json
scripts/derisk/.venv/bin/modal run scripts/derisk/voice_modal.py   # tests 4 + 5, writes out/04 + out/05/karaoke.html
```

The Node scripts need `MODEL_API_KEY` in `.env`. The Modal script needs `modal setup` once. Outputs
(`scripts/derisk/out/`) and input photos (`scripts/derisk/input/`) are not committed.

## 0. Meta Model API access

- Auth: `Authorization: Bearer $MODEL_API_KEY`, base URL `https://api.meta.ai/v1`, OpenAI-compatible
  (Responses and Chat Completions).
- From Cameroon, `GET /v1/models` answers in 1.7 s and lists the 9 models: `muse-wonder-1.0`,
  `muse-spark-1.3`, `muse-spark-1.2`, `muse-spark-1.1` (+ two `-contributor` variants), `muse-image-1.0`,
  `sam-3.1`, `muse-voice-transcribe-1.0`.
- Inference calls return `402 billing_not_configured` until a card is added on the Billing page, even
  with hackathon credits. Fixed on 26 October.
- **Go.**

## 1. Muse Spark: page photo → lesson JSON

Input: a scan of a French curriculum page ("Préambule, histoire-géographie, classe de seconde", Conseil
supérieur des programmes), PNG 1222 × 1364. It is **not a Cameroonian textbook page** and its text is
abstract, so this run tests the mechanics, not the demo content. A Cameroonian science page with a
diagram is still needed for the demo.

Setup: `muse-spark-1.3` through Chat Completions, `reasoning_effort: "medium"`, image as a base64 data
URL, structured output with `strict: true` and a JSON Schema generated from the Zod schema
(`lesson-schema.mts`, via `z.toJSONSchema`).

- The strict schema was accepted as is, and the answer passed Zod validation on the first try.
- **22.7 s**, 3,166 input tokens and 6,901 output tokens (4,484 of them reasoning): **$0.033**.
- Reading: `page.keyText` matches the printed text, headings included.
- Content: 6 scenes, 11 highlights, a 3-question quiz with the right answers in varied positions, the art
  style, and an image prompt per scene with Cameroonian students. Every highlight phrase appears in its
  narration, and there are no digits. The teaching stays faithful to the page.
- Pidgin: written with Cameroonian markers ("di", "sabi", "wey", "dem", "helep"). Not yet reviewed by a
  native speaker.
- **Too short**: 171 French words ≈ 1.1 min (Pidgin 192 words ≈ 1.3 min), against the 2–3 min target. The
  prompt asks for ~30 words per scene, which can't reach 2 minutes.

**Decision: go.** Fix the prompt to ask for ~8 scenes of 45–55 words (350–450 words, ≈ 2.5 min).

## 2. Muse Image: 6 scenes in one style

Setup: `muse-image-1.0`, `size: "1280x720"` (aspect ratio only), JPEG. Two strategies:
A, six independent `/images/generations` calls with the shared `artStyle`; B, scene 1 from A passed as a
reference image to `/images/edits` for the five other scenes.

| | Per image | 6 scenes (parallel) | Billed |
|---|---|---|---|
| A, independent | 10–20 s | 25 s | 6 images |
| B, reference | 20–35 s | 36 s after scene 1 | 5 images |

- All 12 images succeeded, at **2048 × 1152** (the API picks the pixels). Total **$0.11** ($0.01 per image).
- Both sets share one flat, warm cartoon style, with no garbled text in the images.
- **A keeps the style but not the characters**: teenagers in green uniforms in scene 1, younger children
  in colorful clothes in scene 2.
- **B keeps the characters**: the same students, with the same green-and-yellow uniform, from scene to
  scene, plus recurring details (the Cameroonian flag).
- Compare: `scripts/derisk/out/02/contact-sheet.html`.

**Decision: go, with strategy B**: generate scene 1, then the other scenes in parallel as edits of that
reference. About 45–60 s for 6 scenes, $0.06.

## 3. SAM 3.1: the named objects → masks

Setup: `sam-3.1` through the Responses API (streaming), one request per highlight, the `samPrompt` as
the concept prompt, the image as a data URL, `metadata.include_confidence: "true"`, parsed with
`@meta-sam/parser` 0.1.0. Run on image set B.

- **7 of 11 objects found**, confidence 0.81–0.95: globe, rural landscape, group of children, wall clock,
  stack of books (2 matches), teacher, map.
- Not found: "wall clock" in scene 2 (the image drew a clock tower), "village community", "stack of
  newspapers", "fork in road". The object was not drawn as named, or the label is abstract.
- 3.7–15 s per request, 24 s wall with 4 in parallel. **$0.028** ($2.50 per 1,000 images).
- Gotcha: for large objects the mask raster is downscaled (at most 1024 px a side: 1024 × 527 for a
  1711 × 881 box). It has to be stretched over its box (`bounds`). Small objects come at 1:1. With that
  fix, the cut-outs follow the outlines exactly (each child, the teacher).
- `decodeMaskToSVGPath` gives an SVG path, usable as a `clipPath` in Remotion: the cut-out layer to
  light up or animate when the voice says the word. Check page: `scripts/derisk/out/03/index.html`.

**Decision: go**, with two changes: the image prompt must ask for every highlight object explicitly, with
concrete single-object `samPrompt`s; and the pipeline drops a highlight SAM can't find instead of
failing.

## 4. Which Cameroonian languages MMS-TTS really covers

Method: the 1,141 `facebook/mms-tts-*` models on Hugging Face, crossed with the 291 languages of Cameroon
listed in Wikidata (ISO 639-3), plus the main vehicular languages. Full list:
[`mms-tts-cameroon-coverage.json`](mms-tts-cameroon-coverage.json).

- **Covered (47)**, among them: French (`fra`), English (`eng`), Nigerian Pidgin (`pcm`), Hausa (`hau`),
  Yemba (`ybb`), Lamnso (`lns`), Makaa (`mcp`), Kenyang (`ken`), Tikar (`tik`), Wandala (`mfi`), Oku
  (`oku`), and several Chadic languages of the Far North.
- **Not covered**: Ewondo, Duala, Basaa, Bulu, Eton, Fang, Ghomálá', Medumba, Fe'fe', Bamun, Adamawa
  Fulfulde (`fub`) and Cameroonian Pidgin (`wes`).
- All covered models use the Latin alphabet (no romanization needed) and output 16 kHz audio.
- License: CC-BY-NC 4.0. Fine for the hackathon, not for commercial use.

**Recommendation (chosen 26 October): Pidgin, with the Nigerian Pidgin voice (`pcm`).** Cameroonian
Pidgin (Kamtok) is close, widely spoken in the North-West, South-West and the big cities, Muse Spark can
write it, and English-speaking judges partly understand it. Alternatives: Yemba (`ybb`, a true
Cameroonian language, but Muse Spark will likely write it poorly), Hausa (`hau`, the northern lingua
franca).

## Where the voice models run

The Meta Model API has no text-to-speech (Muse Voice Transcribe is speech-to-text), so MMS must run on
our own compute. Downloading the weights locally is not realistic: the connection measured ~385 KB/s, and
the three models weigh ~1.55 GB (`mms-tts-fra` 145 MB, `mms-tts-pcm` 145 MB, MMS_FA aligner 1.26 GB).
They run on **Modal** (hackathon partner, $100 credits granted), which downloads them in its cloud and
caches them on a Volume.

## 4. MMS-TTS: French and Pidgin voices

Setup (`scripts/derisk/voice_modal.py`): one Modal class loads `facebook/mms-tts-fra`,
`facebook/mms-tts-pcm` and the aligner, with weights cached on the `lessoncast-model-cache` Volume. It
synthesizes sentence by sentence (VITS, fixed seed), adds 0.35 s of silence between sentences, and returns
a 16 kHz mono WAV. Each run goes first on CPU (4 cores, 8 GiB), then on a T4 GPU (`with_options`).

Input: a 4-sentence sample about the heart (≈15 s of audio per language), because test 1 has no lesson
yet. The script switches to the real narration as soon as `out/01/lesson.json` exists.

| Run | Audio | Wall time | Model load | TTS | Align |
|---|---|---|---|---|---|
| CPU, French, cold (first ever: downloads 1.5 GB to the Volume) | 14.6 s | 45.7 s | 27.3 s | 5.1 s | 2.2 s |
| CPU, Pidgin, warm | 15.0 s | 7.0 s | — | 3.3 s | 2.3 s |
| T4, French, cold (weights from the Volume) | 14.6 s | 35.2 s | 18.8 s | 3.1 s* | 0.4 s |
| T4, Pidgin, warm | 15.0 s | 1.3 s | — | 0.3 s | 0.3 s |

\* includes CUDA warm-up on the first call; warm TTS on T4 is ~0.3 s for 15 s of audio.

Rerun on the real narration from test 1 (weights already on the Volume):

| Run | Audio | Wall time | Model load | TTS | Align |
|---|---|---|---|---|---|
| CPU, French, cold | 75.6 s | 61.3 s | 9.6 s | 22.4 s | 13.7 s |
| CPU, Pidgin, warm | 71.6 s | 36.7 s | — | 18.8 s | 12.8 s |
| T4, French, cold | 75.6 s | 29.6 s | 10.5 s | 3.5 s | 1.4 s |
| T4, Pidgin, warm | 71.6 s | 8.3 s | — | 1.1 s | 1.3 s |

On T4 the compute is ~2.5 s for 72 s of audio; most of the 8.3 s wall time is sending the 2.3 MB WAV back
to a laptop in Cameroon. In the app, the pipeline consumes the audio server-side, so that cost goes away.

- Whole first run, image build included: 2 min 10 s. Modal downloaded the weights at ~120 MB/s.
- Cost: **$0.02** for the whole test (Modal billing summary), covered by credits. Rates: T4 $0.59/h,
  CPU $0.047/core/h, memory $0.008/GiB/h.
- For a 2.5-minute lesson (150 s of audio): about 6 s of compute on a warm T4, about 1 min on CPU. With a
  cold start and the 60 s scale-down window, that is roughly $0.02 per lesson on T4 and $0.01 on CPU.

**Decision: go, on a T4.** Speed and cost are fine, and the GPU keeps the voice step under ~40 s even
cold. The service scales to zero (no `min_containers`); warm it only while recording the demo.

Listening check (28 October, by the project's Cameroonian developer): the French and Pidgin voices are
**acceptable for the demo**. To confirm with the teachers and parents in the 2–3 November tests.

## 5. MMS forced alignment: word timestamps

Setup: `torchaudio.pipelines.MMS_FA` (wav2vec2, 1.26 GB) aligns each sentence's TTS audio to its text.
Words are romanized with `uroman` and reduced to the aligner's alphabet (a–z and the apostrophe), and
sentence offsets are added so the timestamps cover the whole narration.

- All 38 French and 45 Pidgin words get a start and an end, in order, within the audio (word durations
  0.02–0.6 s). Sentence pauses show up as gaps (for example "poitrine." ends at 3.19 s, "Il" starts at
  4.05 s).
- Alignment score: French, every word ≥ 0.5. Pidgin, 7 of 45 words < 0.5 ("Heart", "we", "Dat", "air",
  …), probably where the Nigerian voice pronounces our Kamtok spelling differently. Timings stay
  plausible, but these words deserve a listen.
- Speed: 0.3 s per 15 s of audio on T4, 2.3 s on CPU.
- On the real narration (171 French words, 192 Pidgin words), every word is timed, in order. Low scores
  (< 0.5): French 6 of 171, Pidgin 34 of 192, mostly English-origin words ("you", "geography", "eye") that
  the Nigerian voice pronounces its own way. Durations stay plausible: the median word lasts 0.16–0.18 s,
  and the only words under 60 ms are short function words ("le", "à", "di").
- Check page: `scripts/derisk/out/05/karaoke.html` plays each voice and lights up the word being spoken.
  Seeking confirms it: 0.5 s → "cœur", 1.4 s → "muscle", 2.9 s → "poitrine", 4.6 s → "environ".

**Decision: go.** Word-level subtitles and "light up the heart when the voice says *cœur*" are feasible
from these timestamps. The narration and alignment can run in the same Modal call, as here.

## 6. Remotion render on Modal (no Lambda)

Question: can a Modal container render the Remotion video, so the pipeline needs no AWS Lambda? Throwaway
spike (not committed): a 10 s, 854 × 480, 30 fps composition with one scene image, a slow zoom, karaoke
subtitles, the narration audio, and the SAM cut-out of the teacher lit up with a yellow outline between 4
and 7 s (CSS `clip-path: url(#cut)` on an SVG `clipPath` built from the SAM path).

Setup: `node:22-bookworm-slim` + Python 3.12, Chrome's Debian libraries (Remotion's Linux dependency
list), `npm install` of Remotion 4.0.534, `npx remotion browser ensure` and `npx remotion bundle` at
image build time; the function runs `renderMedia` on the bundle with 8 CPUs and 8 GiB.

- Image build: 41 s, once per deploy. Cold start + render: 11.4 s. Warm render: 4.2–10 s for 10 s of
  video, so roughly 1 to 2.5 min for a 2.5-minute lesson.
- The frames are right: the cut-out, the outline, the dimmed background and the highlighted word all
  render as in the browser.
- Size, extrapolated to 2.5 min: CRF 28 → 13.6 MB (too big); CRF 33 → 6.2 MB; 350 kbit/s → 7.0 MB;
  **300 kbit/s with `x264Preset: "slow"` → 6.1 MB**, still sharp at 480p for flat illustrations. Audio:
  AAC 48 kbit/s.
- Cost: about $0.02 per render (8 cores at $0.047/core/h, plus memory).

**Decision: go.** Render on Modal with `videoBitrate: "300k"`, `x264Preset: "slow"`, AAC 48 kbit/s;
Remotion Lambda stays the fallback (already used in BuildStory AI).

## 7. Muse Spark: a textbook PDF → its lessons

Added on 28 October, for books: a teacher uploads a whole textbook or ebook, and Muse Spark lists its
lessons so the teacher can pick one to film.

Setup: the script builds a 10-page PDF with pdf-lib (a cover, a table of contents, two typed lessons, one
real photographed textbook page as a scanned page, and a page of exercises) and sends it inline to
`muse-spark-1.3` through Chat Completions, as a `file` part (`file_data`, a base64 data URL), with a strict
JSON schema: the book's title, subject and level, and each lesson's title, first and last page, a
one-sentence summary and whether it continues from before the file.

- **Chat Completions takes the PDF inline with strict structured output.** The two typed lessons came
  back with their exact pages (3–4 and 7–8), and the cover, contents and exercises were left out. 14 s,
  24 k tokens in, 2.5 k out, **$0.04**.
- **Muse Spark reads the page images, not just the text layer**: on a PDF of the scanned page alone
  (`--scan-only`), it read the title printed in the photo ("Histoire géographie, enseignement commun,
  classe de seconde"). It listed no lesson there, rightly: that page is a curriculum overview.
- About 2,500 input tokens per page, so about $1 to read a 300-page book.
- The Files API docs set the limits: an inline file is at most 50 MB, and the model reads the text of a
  PDF's first 100 pages and the images of its first 50.

**Decision: go**, with the book sent in slices of 30 pages, so Muse Spark sees every page, text and
image; pages are counted from 1 in each slice and mapped back in code.

## Next: the full pipeline

Planned for 28–30 October: the whole chain, even rough: photo → script → images → voice → MP4.

```
Next.js page ──upload──▶ Supabase Storage + lessons row ──trigger──▶ Trigger.dev pipeline
  1. script      Muse Spark, structured output + Zod                         ~25 s   $0.04
  2a. images     scene 1, then the other scenes as edits of it (parallel)    ~50 s   $0.08
  2b. voice      Modal (T4, scale to zero): MMS-TTS + MMS alignment          ~10–40 s $0.02
  3. highlights  SAM 3.1, one request per highlight (parallel)              ~15 s   $0.03
  4. render      Remotion 480p H.264: images, word subtitles, SAM cut-outs
                 lit up on their word, quiz at the end                       render time to measure
  5. deliver     MP4 to Supabase Storage, live status in the page
```

Steps 2a and 2b only need the script, so they run in parallel. Estimated cost per lesson: about $0.20.
Time before rendering: about 1.5 to 2 minutes.

Changes the tests call for:

1. **Lesson length**: ask for ~8 scenes of 45–55 words (350–450 words ≈ 2.5 min) instead of 6 × 30.
2. **Highlights SAM can find**: every highlight object must be named in its scene's image prompt
   ("show clearly: a wall clock"), with concrete single-object `samPrompt`s. Drop a highlight SAM doesn't
   find. A stronger option, and a good "use of Meta AI tooling" point: have Muse Spark look at the
   generated image and choose the noun phrase for SAM.
3. **Image consistency**: strategy B (reference image) by default.
4. **SAM masks**: stretch each mask raster over its box before drawing it.
5. **Voice service**: deploy `voice_modal.py`'s class as a Modal app (`modal deploy`), call it from the
   pipeline with Modal's JS SDK, warm the GPU in `@modal.enter` with a dummy sentence, and keep it scaled
   to zero except while recording the demo.
6. **Remotion**: check early that 2–3 minutes at 480p fit under 10 MB (expect ~250–400 kbit/s video).

Still open:

- **A real Cameroonian textbook page**, ideally science with a diagram, to rerun tests 1–3 on demo
  content. The test page was a French curriculum preamble.
- **A native speaker's review of the Pidgin text** written by Muse Spark (the voices themselves are
  validated).
- Bonus, after the main pipeline: a teacher's voice note as input (Omnilingual ASR on Modal, or Muse
  Voice Transcribe on the Model API).
