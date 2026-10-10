#!/usr/bin/env bash
# Gera o reel "Lua em Falta" do zero: quadros + trilha + MP4 (requer python3, numpy, pillow, ffmpeg).
set -euo pipefail
cd "$(dirname "$0")"
TMP="${TMPDIR:-/tmp}/lua-em-falta"
rm -rf "$TMP" && mkdir -p "$TMP/frames"
python3 render.py "$TMP/frames"
python3 music.py "$TMP/trilha.wav"
ffmpeg -v error -y -framerate 30 -i "$TMP/frames/%04d.png" -i "$TMP/trilha.wav" \
  -c:v libx264 -preset slow -crf 21 -pix_fmt yuv420p -profile:v high \
  -c:a aac -b:a 192k -movflags +faststart -shortest lua-em-falta.mp4
echo "pronto: $(pwd)/lua-em-falta.mp4"
