"""Deterministically repackage the official Apache-2.0 Polish model for Vosk Browser."""
import argparse
import gzip
import hashlib
import io
from pathlib import Path
import subprocess
import tarfile
import zipfile

URL = "https://alphacephei.com/vosk/models/vosk-model-small-pl-0.22.zip"
SHA256 = "c4cd16498ea544f446f9e9a55cbd602b71cfe5a2b6f2b0834d81e1b6fce15f0d"
parser = argparse.ArgumentParser()
parser.add_argument("--zip", type=Path)
args = parser.parse_args()
content = args.zip.read_bytes() if args.zip else subprocess.check_output(["curl", "-fsSL", "--retry", "2", URL])
if hashlib.sha256(content).hexdigest() != SHA256:
    raise ValueError("Nieoczekiwana suma kontrolna modelu.")
out = Path(__file__).resolve().parents[2] / "public/voice/vosk-small-pl-0.22.tar.gz"
out.parent.mkdir(parents=True, exist_ok=True)
with out.open("wb") as output, gzip.GzipFile(fileobj=output, mode="wb", filename="", mtime=0, compresslevel=6) as gz:
    with tarfile.open(mode="w", fileobj=gz) as tar, zipfile.ZipFile(io.BytesIO(content)) as archive:
        for file in sorted(archive.infolist(), key=lambda f: f.filename):
            info = tarfile.TarInfo(file.filename)
            if file.is_dir():
                info.type = tarfile.DIRTYPE
                info.mode = 0o755
                tar.addfile(info)
                continue
            info.size = file.file_size
            with archive.open(file) as data:
                tar.addfile(info, data)
