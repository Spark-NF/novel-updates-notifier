#!/usr/bin/env bash


tsc -w -p "src/tsconfig.json" &
rollup --w src/background/background.js --o src/background/bundle.js --no-treeshake --f esm &
rollup --w src/popup/main.js --o src/popup/bundle.js --f esm &
