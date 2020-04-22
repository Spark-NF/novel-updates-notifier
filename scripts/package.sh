#!/usr/bin/env bash

set -e

VERSION=`jq -r '.version' manifest.json`
TARGET="$1"
EXT="zip"
if [ $TARGET == "firefox" ]; then
    EXT="xpi"
fi
ZIPFILE="packages/novel-updates-notifier-$VERSION-$TARGET.$EXT"

echo "Packaging version $VERSION for $TARGET in '$ZIPFILE'"

mkdir -p "packages"

# Add basic files
rm -f $ZIPFILE
zip -r -q $ZIPFILE . -x "src/**/*.ts" "src/**/*.js" "src/**/*.vue" "src/**/*.map" "src/common/" -i "LICENSE" "README.md" "icons/*" "src/**/*" "_locales/**/*"
zip -r -q $ZIPFILE . -i "src/vendor/**/*.js" "src/**/bundle.js"

# Generate and add manifest file
if [ $TARGET == "chrome" ]; then
    jq "del(.developer,.applications,.sidebar_action)" "manifest.json" > "packages/manifest.json"
elif [ $TARGET == "edge" ]; then
    jq "del(.developer,.applications,.sidebar_action,.browser_action.theme_icons)" "manifest.json" > "packages/manifest.json"
else
    jq ".permissions=([.permissions,.optional_permissions]|flatten) | del(.optional_permissions)" "manifest.json" > "packages/manifest.json"
fi
pushd "packages"
    zip -r -q "../$ZIPFILE" . -i "manifest.json"
    rm "manifest.json"
popd
