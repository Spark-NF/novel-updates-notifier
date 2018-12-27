#!/usr/bin/env bash

set -e

VERSION=`jq -r '.version' manifest.json`
TARGET="$1"
ZIPFILE="packages/novel-updates-notifier-$VERSION-$TARGET.zip"

echo "Packaging version $VERSION for $TARGET in '$ZIPFILE'"

mkdir -p "packages"

# Add basic files
rm -f $ZIPFILE
zip -r -q $ZIPFILE . -x "src/**/*.ts" "src/**/*.js" "src/common/" -i "LICENSE" "README.md" "icons/*" "src/**/*"
zip -r -q $ZIPFILE . -i "src/vendor/**/*.js" "src/**/bundle.js"

# Generate and add manifest file
if [ $TARGET = "chrome" ]; then
    jq "del(.applications)" "manifest.json" > "packages/manifest.json"
else
    cp "manifest.json" "packages/manifest.json"
fi
pushd "packages"
    zip -r -q "../$ZIPFILE" . -i "manifest.json"
    rm "manifest.json"
popd