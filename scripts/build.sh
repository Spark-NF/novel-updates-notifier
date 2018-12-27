#!/usr/bin/env bash

tsc -p "src/tsconfig.json"

rollup "src/background/background.js" -o "src/background/bundle.js" --no-treeshake -f esm
rollup "src/popup/popup.js" -o "src/popup/bundle.js" --no-treeshake -f esm
rollup "src/sidebar/sidebar.js" -o "src/sidebar/bundle.js" --no-treeshake -f esm
rollup "src/userstyles/apply.js" -o "src/userstyles/bundle.js" --no-treeshake -f esm
rollup -c "src/rollup.spec.config.js" -o "src/spec_bundle.js" --no-treeshake -f esm
