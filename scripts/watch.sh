#!/usr/bin/env bash

tsc -w -p "src/tsconfig.json" &

rollup --w "src/background/background.js" --o "src/background/bundle.js" --no-treeshake --f esm &
rollup --w "src/popup/popup.js" --o "src/popup/bundle.js" --no-treeshake --f esm &
rollup --w "src/sidebar/sidebar.js" --o "src/sidebar/bundle.js" --no-treeshake --f esm &
rollup --w "src/userstyles/apply.js" --o "src/userstyles/bundle.js" --no-treeshake --f esm
