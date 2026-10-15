#!/bin/bash
# Sync user's RAR update into working tree with CRLF→LF normalization
set -e
E=/home/z/my-project/upload/extracted
P=/home/z/my-project

norm_copy () {
  # $1 = src file (in RAR), $2 = dest file
  mkdir -p "$(dirname "$2")"
  if [[ "$1" == *.bat ]]; then
    cp "$1" "$2"   # keep CRLF for Windows batch files
  else
    sed 's/\r$//' "$1" > "$2"
  fi
}

echo "── src/ (full replace, normalized) ──"
rm -rf $P/src
cp -r $E/src $P/src
# normalize all text files under src (ts/tsx/css known text)
find $P/src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.css" -o -name "*.mjs" \) -exec sed -i 's/\r$//' {} +

echo "── prisma schemas ──"
norm_copy $E/prisma/schema.prisma $P/prisma/schema.prisma
norm_copy $E/prisma/schema.postgres.prisma $P/prisma/schema.postgres.prisma

echo "── public/ ──"
norm_copy $E/public/logo.svg $P/public/logo.svg
norm_copy $E/public/robots.txt $P/public/robots.txt
norm_copy $E/public/manifest.json $P/public/manifest.json

echo "── package.json ──"
norm_copy $E/package.json $P/package.json

echo "── AGENTS.md + build_apk.bat ──"
norm_copy $E/AGENTS.md $P/AGENTS.md
cp $E/build_apk.bat $P/build_apk.bat

echo "── gestiona_mobile_app/ (skip build dirs) ──"
rm -rf $P/gestiona_mobile_app
cp -r $E/gestiona_mobile_app $P/gestiona_mobile_app
# normalize dart/yaml/md text files, keep binaries (pngs etc.)
find $P/gestiona_mobile_app -type f \( -name "*.dart" -o -name "*.yaml" -o -name "*.md" -o -name "*.xml" -o -name "*.gradle" -o -name "*.kt" -o -name "*.java" -o -name "*.iml" -o -name "*.plist" -o -name "*.swift" -o -name "*.xcconfig" -o -name "*.properties" \) -exec sed -i 's/\r$//' {} +
# remove build artifacts if any
find $P/gestiona_mobile_app -type d \( -name "build" -o -name ".dart_tool" \) -exec rm -rf {} + 2>/dev/null || true

echo "✅ Sync complete"
