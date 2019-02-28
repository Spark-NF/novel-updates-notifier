#!/usr/bin/env bash

tsc -w -p "src/tsconfig.json" &

rollup "dist/background/background.js" -o "src/background/bundle.js" --no-treeshake -f esm -w &
rollup "dist/popup/popup.js" -o "src/popup/bundle.js" --no-treeshake -f esm -w &
rollup "dist/options/options.js" -o "src/options/bundle.js" --no-treeshake -f esm -w &
rollup "dist/sidebar/sidebar.js" -o "src/sidebar/bundle.js" --no-treeshake -f esm -w &
rollup "dist/userstyles/apply.js" -o "src/userstyles/bundle.js" --no-treeshake -f esm -w
