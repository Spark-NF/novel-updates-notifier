#!/usr/bin/env bash

tsc -p "src/tsconfig.json"

rollup src/background/background.js --o src/background/bundle.js --no-treeshake --f esm
rollup src/popup/main.js --o src/popup/bundle.js --f esm
