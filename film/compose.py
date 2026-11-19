"""Bundle intact portrait captures, touch positions and chapter titles for the silent film."""

import base64
import json
from pathlib import Path

root = Path(__file__).resolve().parent
project = root.parent
source = root / "work" / "silent"
timeline = json.loads((root / "scenes.json").read_text())


def uri(file, mime):
    return f"data:{mime};base64," + base64.b64encode(file.read_bytes()).decode()


clips = {}
captures = {}
for chapter in timeline["chapters"]:
    key = chapter["id"]
    clips[key] = uri(source / f"{key}.mp4", "video/mp4")
    captures[key] = json.loads((source / f"{key}.json").read_text())

html = (root / "canvas.html").read_text()
for tag, payload in {
    "TIMELINE": timeline,
    "CLIPS": clips,
    "CAPTURES": captures,
    "QR": uri(project / "web/public/media/demo-qr.png", "image/png"),
    "TITLEFONT": uri(project / "presentation/fonts/Montserrat-Bold.ttf", "font/ttf"),
}.items():
    html = html.replace(f"@@{tag}@@", json.dumps(payload, ensure_ascii=False))
(root / "output.html").write_text(html)
