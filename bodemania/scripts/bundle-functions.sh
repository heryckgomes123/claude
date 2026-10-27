#!/usr/bin/env bash
# Empacota cada Edge Function num único index.js (mesmo código de supabase/functions, sem os imports relativos).
# Usado para publicar pelo painel/conector do Supabase sem a CLI:
#   scripts/bundle-functions.sh   →  supabase/.bundles/<função>/index.js
# Publicar com Verify JWT desligado (as funções validam o usuário/assinatura no próprio código).
set -euo pipefail
cd "$(dirname "$0")/../supabase/functions"
out=../.bundles
rm -rf "$out"
for f in create-order shipping-quote admin-order mp-webhook; do
  mkdir -p "$out/$f"
  npx --yes esbuild@0.25 "$f/index.ts" --bundle --format=esm --platform=neutral --target=es2022 \
    --external:'npm:*' --minify-whitespace --minify-syntax --legal-comments=none --charset=utf8 \
    --outfile="$out/$f/index.js" --log-level=warning
done
ls -l "$out"/*/index.js
