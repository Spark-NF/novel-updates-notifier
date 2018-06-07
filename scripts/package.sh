#!/usr/bin/env bash

VERSION=`jq -r '.version' manifest.json`
ZIPFILE="packages/$VERSION.zip"

mkdir -p "packages"

rm -f $ZIPFILE
zip -r -q $ZIPFILE . -x "src/**/*.ts" "src/**/*.js" "src/common/" -i "LICENSE" "README.md" "manifest.json" "icons/*" "src/**/*"
zip -r -q $ZIPFILE . -i "src/vendor/**/*.js" "src/**/bundle.js"