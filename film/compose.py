"""Bundle the phone recordings, touch positions and speech cues for the Canvas renderer."""

import base64
import json
from pathlib import Path

root = Path(__file__).resolve().parent
project = root.parent
source = root / "work" / "mobile"
timeline = json.loads((root / "scenes.json").read_text())


def uri(file, mime):
    return f"data:{mime};base64," + base64.b64encode(file.read_bytes()).decode()


clips = {}
motion = {}
for key, _, _ in timeline["shots"]:
    if key in ("open", "close"):
        continue
    clips[key] = uri(source / f"{key}.mp4", "video/mp4")
    motion[key] = json.loads((source / f"{key}.json").read_text())
clips["panorama"] = uri(root / "assets/chmielna-panorama.mp4", "video/mp4")
pictures = {
    "scene": uri(
        project / "presentation/assets/punkt-zdarzenia-przy-lawce.jpg", "image/jpeg"
    ),
    "bag": uri(
        project / "presentation/assets/powrot-z-defibrylatorem.jpg", "image/jpeg"
    ),
    "qr": uri(project / "web/public/media/demo-qr.png", "image/png"),
}
html = (root / "canvas.html").read_text()
for tag, payload in {
    "SHOTS": timeline["shots"],
    "WORDS": json.loads((root / "assets/word-cues.json").read_text()),
    "CLIPS": clips,
    "MOTION": motion,
    "IMAGES": pictures,
    "TITLEFONT": uri(project / "presentation/fonts/Montserrat-Bold.ttf", "font/ttf"),
}.items():
    html = html.replace("@@" + tag + "@@", json.dumps(payload, ensure_ascii=False))
(root / "output.html").write_text(html)
