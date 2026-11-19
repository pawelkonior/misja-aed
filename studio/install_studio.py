"""Install the Misja AED project and its native video in a sibling Presentation Studio."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

HERE = Path(__file__).resolve().parent
PROJECT = HERE.parent
VIDEO_URL = "/media/misja-aed/demo.mp4"
PATCH = HERE / "presentation-engine.patch"


def run(studio, *args, **kwargs):
    return subprocess.run(args, cwd=studio, check=True, **kwargs)


def install_file(source, destination):
    digest = lambda p: hashlib.sha256(p.read_bytes()).digest()
    if destination.exists() and digest(source) == digest(destination):
        return
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=destination.parent, delete=False) as staging:
        temp = Path(staging.name)
    try:
        shutil.copy2(source, temp)
        os.replace(temp, destination)
    finally:
        temp.unlink(missing_ok=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--studio", type=Path, default=PROJECT.parent / "presentation_engine")
    args = parser.parse_args()
    studio = args.studio.expanduser().resolve()
    if not (studio/"src/lib/risk-engine-template.ts").is_file():
        parser.error("Wskaż właściwą instancję Presentation Studio z szablonem Risk Engine.")
    source = PROJECT / "deliverables/Misja-AED.studio.json"
    video = PROJECT / "deliverables/Misja-AED-60s.mp4"
    if not video.stat().st_size:
        parser.error("Plik filmu jest pusty.")
    slides = json.loads(source.read_bytes())["slides"]
    videos = [el["videoSrc"] for s in slides for el in s["elements"] if "videoSrc" in el]
    if any(url != VIDEO_URL for url in videos):
        parser.error("Nieobsługiwana ścieżka filmu. Oczekiwana: " + VIDEO_URL)

    # Call the target Studio's own validator before touching its source files.
    # The compatibility alias lets the original validator inspect this project
    # before the narrowly scoped AED media URL is added by the patch.
    check = """
import fs from 'node:fs';
import {validateDeck} from './src/lib/model.ts';
const value = JSON.parse(fs.readFileSync(process.argv[1],'utf8'));
for(const s of value.slides)for(const e of s.elements)
  if(e.videoSrc==='/media/misja-aed/demo.mp4') e.videoSrc='/media/risk-engine/demo.mp4';
if(!validateDeck(value)) throw new Error('Studio odrzuciło format projektu.');
"""
    run(studio, "node", "--import", "tsx", "--input-type=module", "-e", check, str(source))
    # Studio can be a plain directory without a Git repository.
    already = subprocess.run(["git", "apply", "--reverse", "--check", str(PATCH)], cwd=studio,
                             stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode == 0
    if not already:
        run(studio, "git", "apply", "--check", str(PATCH))
    install_file(source, studio / "output/misja-aed/Misja-AED.studio.json")
    install_file(video, studio / "public/media/misja-aed/demo.mp4")
    if not already:
        run(studio, "git", "apply", str(PATCH))
    print(f"Zainstalowano {len(slides)} slajdów i {len(videos)} osadzeń filmu.")
    print("http://127.0.0.1:5174/?deck=misja-aed")


if __name__ == "__main__":
    main()
