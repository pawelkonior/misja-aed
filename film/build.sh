#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
node record-live.mjs
python3 compose.py
npm --prefix harness ci --no-audit --no-fund
node harness/render.mjs output.html --fps 30 --out work/picture.mp4
ffmpeg -hide_banner -loglevel error -y -i work/picture.mp4 -i assets/narracja.m4a -map 0:v -map 1:a -c copy -t 60 -movflags +faststart ../deliverables/Misja-AED-60s.mp4
