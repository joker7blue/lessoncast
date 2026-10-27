"""Derisk tests 4 and 5 on Modal.

Test 4: MMS-TTS reads the lesson narration aloud in French (mms-tts-fra) and Pidgin (mms-tts-pcm).
Test 5: MMS forced alignment (torchaudio MMS_FA) gives the start and end time of every word.

Both run first on CPU, then on a GPU, to compare speed and cold starts:

    modal run scripts/derisk/voice_modal.py              # GPU defaults to T4
    modal run scripts/derisk/voice_modal.py --gpu L4

Narration comes from out/01/lesson.json when test 1 has run, otherwise from SAMPLE below.
Writes out/04/<device>-<lang>.wav, out/04/metrics.json, out/05/<device>-<lang>.json and
out/05/karaoke.html (plays each audio and highlights the word being spoken).
"""

import base64
import html
import io
import json
import re
import time
import wave
from pathlib import Path

import modal

VOICES = {"fr": "facebook/mms-tts-fra", "pcm": "facebook/mms-tts-pcm"}
SAMPLE_RATE = 16_000  # MMS-TTS output rate, and the rate MMS_FA expects
PAUSE_SECONDS = 0.35  # silence between sentences

# Used when test 1 has not produced a lesson yet. The Pidgin is Cameroonian (Kamtok) and needs a
# native speaker's check.
SAMPLE = {
    "fr": [
        "Le cœur est un muscle qui se trouve dans la poitrine.",
        "Il bat environ soixante-dix fois par minute.",
        "À chaque battement, il envoie le sang dans tout le corps.",
        "Le sang apporte l'oxygène aux muscles et au cerveau.",
    ],
    "pcm": [
        "Heart na one muscle weh e dey inside we chest.",
        "E di knock like seventy time for one minute.",
        "Every time weh e knock, e di push blood go for all we body.",
        "Dat blood di carry air give we muscle dem and we brain.",
    ],
}

CACHE_DIR = "/cache"
cache = modal.Volume.from_name("lessoncast-model-cache", create_if_missing=True)

image = (
    modal.Image.debian_slim(python_version="3.12")
    .uv_pip_install(
        "torch==2.5.1",
        "torchaudio==2.5.1",
        "transformers==4.46.3",
        "uroman==1.3.1.1",
        "numpy<2",
    )
    # Model weights live on the Volume, so only the first cold start downloads them.
    .env({"HF_HOME": f"{CACHE_DIR}/hf", "TORCH_HOME": f"{CACHE_DIR}/torch", "HF_XET_HIGH_PERFORMANCE": "1"})
)

app = modal.App("lessoncast-derisk-voice")


@app.cls(image=image, volumes={CACHE_DIR: cache}, cpu=4.0, memory=8192, scaledown_window=60, timeout=900)
class Voice:
    @modal.enter()
    def load(self) -> None:
        import torch
        import torchaudio
        import uroman
        from transformers import AutoTokenizer, VitsModel

        start = time.perf_counter()
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.tts = {
            lang: (AutoTokenizer.from_pretrained(repo), VitsModel.from_pretrained(repo).to(self.device).eval())
            for lang, repo in VOICES.items()
        }
        bundle = torchaudio.pipelines.MMS_FA
        self.aligner_model = bundle.get_model(with_star=False).to(self.device).eval()
        self.aligner_tokenizer = bundle.get_tokenizer()
        self.aligner = bundle.get_aligner()
        self.alphabet = {c for c in bundle.get_dict(star=None) if c != "-"}
        self.uroman = uroman.Uroman()
        cache.commit()
        self.load_seconds = round(time.perf_counter() - start, 2)

    def normalize(self, word: str, lang: str) -> str:
        """The aligner only knows lowercase Latin letters and the apostrophe."""
        romanized = self.uroman.romanize_string(word, lcode="fra" if lang == "fr" else None)
        return "".join(c for c in romanized.lower() if c in self.alphabet)

    def align(self, waveform, text: str, lang: str, offset: float) -> list[dict]:
        import torch

        words = text.split()
        normalized = [self.normalize(w, lang) for w in words]
        kept = [i for i, n in enumerate(normalized) if n]
        if not kept:
            return []
        with torch.inference_mode():
            emission, _ = self.aligner_model(waveform.unsqueeze(0))
        spans = self.aligner(emission[0], self.aligner_tokenizer([normalized[i] for i in kept]))
        seconds_per_frame = waveform.shape[0] / emission.shape[1] / SAMPLE_RATE
        timed = []
        for i, word_spans in zip(kept, spans):
            frames = sum(s.end - s.start for s in word_spans)
            timed.append(
                {
                    "word": words[i],
                    "start": round(offset + word_spans[0].start * seconds_per_frame, 3),
                    "end": round(offset + word_spans[-1].end * seconds_per_frame, 3),
                    "score": round(sum(s.score * (s.end - s.start) for s in word_spans) / frames, 3),
                }
            )
        return timed

    @modal.method()
    def narrate(self, sentences: list[str], lang: str) -> dict:
        import torch

        tokenizer, model = self.tts[lang]
        pause = torch.zeros(int(PAUSE_SECONDS * SAMPLE_RATE), device=self.device)
        pieces, words = [], []
        offset = tts_seconds = align_seconds = 0.0
        for sentence in sentences:
            t = time.perf_counter()
            torch.manual_seed(0)  # VITS samples noise: keep runs reproducible
            with torch.inference_mode():
                inputs = tokenizer(sentence, return_tensors="pt").to(self.device)
                waveform = model(**inputs).waveform[0]
            tts_seconds += time.perf_counter() - t

            t = time.perf_counter()
            words += self.align(waveform, sentence, lang, offset)
            align_seconds += time.perf_counter() - t

            pieces += [waveform, pause]
            offset += (waveform.shape[0] + pause.shape[0]) / SAMPLE_RATE

        audio = torch.cat(pieces).clamp(-1, 1).cpu().numpy()
        buffer = io.BytesIO()
        with wave.open(buffer, "wb") as wav:
            wav.setnchannels(1)
            wav.setsampwidth(2)
            wav.setframerate(SAMPLE_RATE)
            wav.writeframes((audio * 32767).astype("int16").tobytes())
        return {
            "wav": buffer.getvalue(),
            "device": self.device,
            "loadSeconds": self.load_seconds,
            "audioSeconds": round(len(audio) / SAMPLE_RATE, 2),
            "ttsSeconds": round(tts_seconds, 2),
            "alignSeconds": round(align_seconds, 2),
            "words": words,
        }


def lesson_sentences() -> tuple[str, dict[str, list[str]]]:
    lesson_file = Path(__file__).parent / "out" / "01" / "lesson.json"
    if not lesson_file.exists():
        return "sample", SAMPLE
    lesson = json.loads(lesson_file.read_text())

    def split(text: str) -> list[str]:
        return [s for s in re.split(r"(?<=[.!?])\s+", text.strip()) if s]

    return "lesson", {lang: [s for scene in lesson["scenes"] for s in split(scene["narration"][lang])] for lang in VOICES}


def karaoke_html(runs: list[dict], audio_dir: Path) -> str:
    """A self-contained page (audio embedded) so it can be opened anywhere or sent to a reviewer."""
    blocks = []
    for run in runs:
        wav = (audio_dir / f"{run['device']}-{run['lang']}.wav").read_bytes()
        src = "data:audio/wav;base64," + base64.b64encode(wav).decode()
        spans = "".join(
            f'<span data-s="{w["start"]}" data-e="{w["end"]}" title="{w["start"]}–{w["end"]}s, score {w["score"]}">{html.escape(w["word"])}</span> '
            for w in run["words"]
        )
        blocks.append(
            f'<section><h2>{run["device"].upper()} · {run["lang"]}</h2>'
            f'<audio controls src="{src}"></audio><p>{spans}</p></section>'
        )
    return f"""<!doctype html><meta charset="utf-8"><title>MMS voice + alignment test</title>
<style>body{{font:18px system-ui;margin:16px;background:#111;color:#ddd;max-width:900px}}audio{{width:100%}}
span{{border-radius:4px;padding:0 2px}}span.on{{background:#ffd400;color:#111}}h2{{font-size:15px;opacity:.7}}</style>
<p>Play an audio: the word being spoken lights up. Hover a word to see its timing and alignment score.</p>
{"".join(blocks)}
<script>
document.querySelectorAll("section").forEach((section) => {{
  const audio = section.querySelector("audio"), words = [...section.querySelectorAll("span")];
  audio.addEventListener("timeupdate", () => {{
    const t = audio.currentTime;
    words.forEach((w) => w.classList.toggle("on", t >= +w.dataset.s && t < +w.dataset.e));
  }});
}});
</script>"""


@app.local_entrypoint()
def main(gpu: str = "T4") -> None:
    source, sentences = lesson_sentences()
    out = Path(__file__).parent / "out"
    (out / "04").mkdir(parents=True, exist_ok=True)
    (out / "05").mkdir(parents=True, exist_ok=True)

    runs = []
    # CPU first: its first cold start downloads the weights to the Volume, the GPU then reuses them.
    for label, voice_cls in [("cpu", Voice), (gpu.lower(), Voice.with_options(gpu=gpu))]:
        voice = voice_cls()
        for call, lang in enumerate(VOICES):
            start = time.perf_counter()
            result = voice.narrate.remote(sentences[lang], lang)
            wall = round(time.perf_counter() - start, 2)
            (out / "04" / f"{label}-{lang}.wav").write_bytes(result.pop("wav"))
            (out / "05" / f"{label}-{lang}.json").write_text(json.dumps(result["words"], ensure_ascii=False, indent=2))
            run = {"lang": lang, "coldStart": call == 0, "wallSeconds": wall, **result, "device": label}
            runs.append(run)
            low = [w["word"] for w in result["words"] if w["score"] < 0.5]
            print(
                f"{label:>4} {lang:>3}: {result['audioSeconds']}s of audio, wall {wall}s"
                f" ({'cold' if call == 0 else 'warm'}; model load {result['loadSeconds']}s,"
                f" TTS {result['ttsSeconds']}s, align {result['alignSeconds']}s),"
                f" {len(result['words'])} words timed, {len(low)} with score < 0.5"
            )

    (out / "05" / "karaoke.html").write_text(karaoke_html(runs, out / "04"))
    metrics = {"narration": source, "runs": [{k: v for k, v in r.items() if k != "words"} for r in runs]}
    (out / "04" / "metrics.json").write_text(json.dumps(metrics, indent=2))
    print(f"Open {out / '05' / 'karaoke.html'}")
