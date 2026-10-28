"""The lesson voice on Modal: MMS-TTS reads the narration, MMS forced alignment times every word.

    scripts/derisk/.venv/bin/modal deploy modal/voice.py

`narrate` takes the narration as ordered groups of sentences (group 0 is the title, then one group
per scene), uploads the WAV to a signed URL and returns every word with its start, end, alignment
score and group. The group boundaries give the title card and scene durations of the video.
Built from the derisk run in scripts/derisk/voice_modal.py (tests 4 and 5).
"""

import io
import time
import urllib.request
import wave

import modal

VOICES = {"fr": "facebook/mms-tts-fra", "pcm": "facebook/mms-tts-pcm"}
SAMPLE_RATE = 16_000  # MMS-TTS output rate, and the rate MMS_FA expects
SENTENCE_PAUSE = 0.35  # silence after every sentence
GROUP_PAUSE = 0.6  # extra silence between groups (title → scene, scene → scene)
TITLE_MIN_SECONDS = 3.0  # the title card stays on screen at least this long

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

app = modal.App("lessoncast-voice")


def fill_unaligned(
    words: list[str], timed: dict[int, tuple[float, float, float]], start: float = 0.0
) -> list[tuple[str, float, float, float]]:
    """Every word of a sentence, in order. A word the aligner couldn't time (a digit, a dash) gets
    zero length at the previous word's end, or at `start` for the first word, and score 0, so it
    still shows in the subtitles."""
    out, previous_end = [], start
    for i, word in enumerate(words):
        if i in timed:
            word_start, word_end, score = timed[i]
            out.append((word, word_start, word_end, score))
            previous_end = word_end
        else:
            out.append((word, previous_end, previous_end, 0.0))
    return out


def pause_after_group(group: int, group_end: float, last: bool) -> float:
    """Silence after a group's last sentence pause: none after the last group, the group pause
    otherwise, plus what the title needs to last TITLE_MIN_SECONDS."""
    if last:
        return 0.0
    title_padding = max(0.0, TITLE_MIN_SECONDS - group_end) if group == 0 else 0.0
    return title_padding + GROUP_PAUSE


# 8 CPUs until the Modal workspace has a payment method, which deployed GPU functions require: then
# gpu="T4" (about 6 s of compute for a lesson instead of about a minute, see docs/derisk.md).
@app.cls(image=image, volumes={CACHE_DIR: cache}, cpu=8.0, memory=8192, scaledown_window=120, timeout=600)
class Voice:
    @modal.enter()
    def load(self) -> None:
        import torch
        import torchaudio
        import uroman
        from transformers import AutoTokenizer, VitsModel

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
        # The first call of each model is slow (CUDA warm-up on a GPU): pay it here, not in a lesson.
        for lang in VOICES:
            self.speak("Bonjour.", lang)

    @modal.method()
    def warm(self) -> None:
        """Called when a lesson starts, so the container is up by the time the narration is ready."""

    def speak(self, sentence: str, lang: str):
        import torch

        tokenizer, model = self.tts[lang]
        torch.manual_seed(0)  # VITS samples noise: keep runs reproducible
        with torch.inference_mode():
            inputs = tokenizer(sentence, return_tensors="pt").to(self.device)
            return model(**inputs).waveform[0]

    def normalize(self, word: str, lang: str) -> str:
        """The aligner only knows lowercase Latin letters and the apostrophe."""
        romanized = self.uroman.romanize_string(word, lcode="fra" if lang == "fr" else None)
        return "".join(c for c in romanized.lower() if c in self.alphabet)

    def align(self, waveform, words: list[str], lang: str, offset: float) -> dict[int, tuple[float, float, float]]:
        import torch

        normalized = [self.normalize(w, lang) for w in words]
        kept = [i for i, n in enumerate(normalized) if n]
        if not kept:
            return {}
        with torch.inference_mode():
            emission, _ = self.aligner_model(waveform.unsqueeze(0))
        spans = self.aligner(emission[0], self.aligner_tokenizer([normalized[i] for i in kept]))
        seconds_per_frame = waveform.shape[0] / emission.shape[1] / SAMPLE_RATE
        timed = {}
        for i, word_spans in zip(kept, spans):
            frames = sum(s.end - s.start for s in word_spans)
            timed[i] = (
                round(offset + word_spans[0].start * seconds_per_frame, 3),
                round(offset + word_spans[-1].end * seconds_per_frame, 3),
                round(sum(s.score * (s.end - s.start) for s in word_spans) / frames, 3),
            )
        return timed

    @modal.method()
    def narrate(self, groups: list[list[str]], lang: str, upload_url: str) -> dict:
        import torch

        def silence(seconds: float):
            return torch.zeros(int(round(seconds * SAMPLE_RATE)), device=self.device)

        pieces, words = [], []
        offset = tts_seconds = align_seconds = 0.0
        for group, sentences in enumerate(groups):
            for sentence in sentences:
                t = time.perf_counter()
                waveform = self.speak(sentence, lang)
                tts_seconds += time.perf_counter() - t

                t = time.perf_counter()
                tokens = sentence.split()
                timed = self.align(waveform, tokens, lang, offset)
                align_seconds += time.perf_counter() - t
                words += [
                    {"word": w, "start": s, "end": e, "score": score, "group": group}
                    for w, s, e, score in fill_unaligned(tokens, timed, start=offset)
                ]

                pieces += [waveform, silence(SENTENCE_PAUSE)]
                offset += waveform.shape[0] / SAMPLE_RATE + SENTENCE_PAUSE
            pause = pause_after_group(group, offset, last=group == len(groups) - 1)
            if pause:
                pieces.append(silence(pause))
                offset += pause

        audio = torch.cat(pieces).clamp(-1, 1).cpu().numpy()
        buffer = io.BytesIO()
        with wave.open(buffer, "wb") as wav:
            wav.setnchannels(1)
            wav.setsampwidth(2)
            wav.setframerate(SAMPLE_RATE)
            wav.writeframes((audio * 32767).astype("int16").tobytes())
        request = urllib.request.Request(
            upload_url,
            data=buffer.getvalue(),
            method="PUT",
            headers={"Content-Type": "audio/wav", "x-upsert": "true"},
        )
        with urllib.request.urlopen(request, timeout=60) as response:
            if response.status >= 300:
                raise RuntimeError(f"WAV upload failed: HTTP {response.status}")

        return {
            "words": words,
            "audioSeconds": round(len(audio) / SAMPLE_RATE, 3),
            "ttsSeconds": round(tts_seconds, 2),
            "alignSeconds": round(align_seconds, 2),
        }
