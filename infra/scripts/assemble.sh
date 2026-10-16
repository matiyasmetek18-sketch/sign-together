#!/bin/sh
set -eu
ROOT="$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)"
DIST="$ROOT/infra/dist"
rm -rf "$DIST"
mkdir -p "$DIST/infra/lambda" "$DIST/shared" "$DIST/node_modules"
cp "$ROOT/infra/lambda/handler.mjs" "$ROOT/infra/lambda/router.mjs" "$ROOT/infra/lambda/dynamoStore.mjs" "$DIST/infra/lambda/"
for file in "$ROOT"/shared/*.mjs; do
  case "$file" in
    *.test.mjs) ;;
    *) cp "$file" "$DIST/shared/" ;;
  esac
done
if [ ! -d "$ROOT/infra/node_modules/@aws-sdk" ]; then
  echo "Install infra dependencies first: npm install --prefix infra" >&2
  exit 1
fi
cp -R "$ROOT/infra/node_modules/." "$DIST/node_modules/"
echo "Assembled $DIST"
