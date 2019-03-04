#!/usr/bin/env bash

tsc -p "src/tsconfig.json"
tslint -p "src/tsconfig.json"

rollup "dist/background/background.js" -o "src/background/bundle.js" --no-treeshake -f esm
rollup "dist/popup/popup.js" -o "src/popup/bundle.js" --no-treeshake -f esm
rollup "dist/options/options.js" -o "src/options/bundle.js" --no-treeshake -f esm
rollup "dist/options/groups.js" -o "src/options/groups.js" --no-treeshake -f esm
rollup "dist/sidebar/sidebar.js" -o "src/sidebar/bundle.js" --no-treeshake -f esm
rollup "dist/userstyles/apply.js" -o "src/userstyles/bundle.js" --no-treeshake -f esm
