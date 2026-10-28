"""The video render on Modal: Remotion turns the lesson's VideoProps into an MP4 (derisk test 6).

    scripts/derisk/.venv/bin/modal deploy modal/render.py

The image installs the repo's own dependencies from the lockfile and bundles the LessonVideo
composition once, at build time. `render` runs modal/render.mjs on that bundle, which uploads the MP4
to a signed URL, so Modal never holds the Supabase keys.
"""

import json
import subprocess
import tempfile
from pathlib import Path

import modal

ROOT = Path(__file__).parent.parent

# Remotion's Linux dependencies for Chrome Headless Shell.
CHROME_LIBS = [
    "libnss3",
    "libdbus-1-3",
    "libatk1.0-0",
    "libgbm-dev",
    "libasound2",
    "libxrandr2",
    "libxkbcommon-dev",
    "libxfixes3",
    "libxcomposite1",
    "libxdamage1",
    "libatk-bridge2.0-0",
    "libpango-1.0-0",
    "libcairo2",
    "libcups2",
]

image = (
    modal.Image.from_registry("node:22-bookworm-slim", add_python="3.12")
    .apt_install(*CHROME_LIBS)
    .run_commands("corepack enable")
    .workdir("/app")
    .add_local_file(ROOT / "package.json", "/app/package.json", copy=True)
    .add_local_file(ROOT / "pnpm-lock.yaml", "/app/pnpm-lock.yaml", copy=True)
    .add_local_file(ROOT / "pnpm-workspace.yaml", "/app/pnpm-workspace.yaml", copy=True)
    .run_commands("pnpm install --frozen-lockfile --prod", "pnpm exec remotion browser ensure")
    .add_local_file(ROOT / "remotion.config.ts", "/app/remotion.config.ts", copy=True)
    .add_local_file(ROOT / "tsconfig.json", "/app/tsconfig.json", copy=True)  # the bundler requires one
    .add_local_dir(ROOT / "src" / "remotion", "/app/src/remotion", copy=True, ignore=["*.test.ts"])
    .add_local_dir(ROOT / "src" / "lib" / "lesson", "/app/src/lib/lesson", copy=True, ignore=["*.test.ts"])
    .add_local_dir(ROOT / "src" / "lib" / "video", "/app/src/lib/video", copy=True, ignore=["*.test.ts"])
    .run_commands("pnpm exec remotion bundle src/remotion/index.ts --out-dir /app/build")
    .add_local_file(ROOT / "modal" / "render.mjs", "/app/modal/render.mjs", copy=True)
)

app = modal.App("lessoncast-render")


@app.function(image=image, cpu=8.0, memory=8192, timeout=900)
def render(props_json: str, upload_url: str) -> dict:
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as props:
        props.write(props_json)
    done = subprocess.run(
        ["node", "/app/modal/render.mjs", props.name, upload_url],
        cwd="/app",
        capture_output=True,
        text=True,
    )
    if done.returncode != 0:
        raise RuntimeError(f"Remotion render failed:\n{done.stderr[-3000:]}")
    return json.loads(done.stdout.strip().splitlines()[-1])
