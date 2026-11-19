#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if [[ "${1:-}" != "--mux-only" ]]; then
  node record-live.mjs
  python3 compose.py
  npm --prefix harness ci --no-audit --no-fund
  node harness/render.mjs output.html --silent --fps 30 --out work/picture.mp4
fi
ffmpeg -hide_banner -loglevel error -y \
  -i work/picture.mp4 -map 0:v:0 -an -c:v copy -t 60 \
  -metadata title='Misja AED — z defibrylatorem do poszkodowanego' \
  -metadata artist='Azeno Hi' \
  -metadata description='Historia świadkini na Chmielnej. Fotografie, ujęcia aplikacji, zaznaczenia dotyku i podświetlana narracja tekstowa. Film bez dźwięku.' \
  -metadata comment='Spacer na Chmielnej: POPtravel, CC BY 3.0. Fotografie bramy i pasażu: Cybularny, CC0 i CC BY 4.0. Zdjęcie szafki: OpenAEDMap, OSM node/14154384101, CC0. Informacje i źródła: https://github.com/pawelkonior/misja-aed/blob/main/docs/media.md' \
  -movflags +faststart work/delivery.pending.mp4
mv work/delivery.pending.mp4 ../deliverables/Misja-AED-60s.mp4
