#!/usr/bin/env bash
# Publish the verified frontend build without changing the working branch.
set -euo pipefail
root="$(git rev-parse --show-toplevel)"
destination="$(git -C "$root" remote get-url origin)"
branch=gh-pages
stage="$(mktemp -d)"
trap 'rm -rf "$stage"' EXIT
(
  cd "$root/web"
  VITE_PUBLIC_BASE=/misja-aed/ npm run build
)
git -C "$stage" init -q -b "$branch"
git -C "$stage" remote add origin "$destination"
if git -C "$stage" ls-remote --exit-code --heads origin "$branch" >/dev/null; then
  git -C "$stage" fetch --depth=1 -q origin "$branch"
  git -C "$stage" reset --mixed -q FETCH_HEAD
fi
cp -R "$root/web/dist/." "$stage/"
mkdir -p "$stage/materialy" "$stage/pokaz"
cp "$root/film/player.html" "$stage/pokaz/index.html"
cp "$root/deliverables/Misja-AED-60s.mp4" "$root/deliverables/Misja-AED.pdf" "$stage/materialy/"
cp "$root/presentation/assets/film-poster.jpg" "$stage/materialy/plakat.jpg"
touch "$stage/.nojekyll"
git -C "$stage" add -A
if git -C "$stage" diff --cached --quiet; then
  echo 'GitHub Pages already contains this build.'
else
  git -C "$stage" commit -qm "Publish Misja AED web demo"
  git -C "$stage" push -q origin "$branch"
fi
