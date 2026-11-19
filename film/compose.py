"""Bundle the live app, recorded touch targets and cinematic source plates."""

import base64
import json
import subprocess
from pathlib import Path

root = Path(__file__).resolve().parent
project = root.parent
source = root / "work" / "story"
timeline = json.loads((root / "scenes.json").read_text())
assets = project / "presentation" / "assets"


def uri(file, mime):
    return f"data:{mime};base64," + base64.b64encode(file.read_bytes()).decode()


clips = {}
captures = {}
for shot in timeline["captures"]:
    key = shot["id"]
    clips[key] = uri(source / f"{key}.mp4", "video/mp4")
    captures[key] = json.loads((source / f"{key}.json").read_text())
panorama = root / "assets" / "chmielna-panorama.mp4"
ambient = source / "street-soft.mp4"
subprocess.run([
    "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(panorama),
    "-an", "-vf", "scale=640:360,gblur=sigma=9,eq=saturation=0.70:contrast=0.93",
    "-c:v", "libx264", "-preset", "fast", "-crf", "23", "-g", "18", str(ambient),
], check=True)
clips["ambient"] = uri(ambient, "video/mp4")
clips["panorama"] = uri(panorama, "video/mp4")
pictures = {
    "bench": uri(assets / "punkt-zdarzenia-przy-lawce.jpg", "image/jpeg"),
    "search": uri(assets / "swiadkini-szuka-wejscia.jpg", "image/jpeg"),
    "bag": uri(assets / "powrot-z-defibrylatorem.jpg", "image/jpeg"),
    "qr": uri(project / "web/public/media/demo-qr.png", "image/png"),
}
html = (root / "canvas.html").read_text()
for tag, payload in {
    "TIMELINE": timeline,
    "CLIPS": clips,
    "CAPTURES": captures,
    "PICTURES": pictures,
    "FONT": uri(project / "presentation/fonts/Montserrat-Bold.ttf", "font/ttf"),
}.items():
    html = html.replace(json.dumps(f"@@{tag}@@"), json.dumps(payload, ensure_ascii=False))
(root / "output.html").write_text(html)
