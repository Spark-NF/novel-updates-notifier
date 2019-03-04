#!/usr/bin/env bash

set -e

mkdir -p "src/vendor/css"
mkdir -p "src/vendor/fonts"
mkdir -p "src/vendor/js"

cp -f "node_modules/bootstrap/dist/css/bootstrap.min.css" "src/vendor/css/"
cp -f "node_modules/bootstrap/dist/css/bootstrap.min.css.map" "src/vendor/css/"
cp -f "node_modules/font-awesome/css/font-awesome.min.css" "src/vendor/css/"
cp -fr "node_modules/font-awesome/fonts/" "src/vendor/"
cp -f "node_modules/vue/dist/vue.min.js" "src/vendor/js/"
cp -f "node_modules/webextension-polyfill/dist/browser-polyfill.min.js" "src/vendor/js/"
cp -f "node_modules/webextension-polyfill/dist/browser-polyfill.min.js.map" "src/vendor/js/"
