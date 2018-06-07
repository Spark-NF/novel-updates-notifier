#!/usr/bin/env bash

set -e

mkdir -p "src/vendor/css"
mkdir -p "src/vendor/fonts"

cp -f "node_modules/bootstrap/dist/css/bootstrap.min.css" "src/vendor/css/"
cp -f "node_modules/font-awesome/css/font-awesome.min.css" "src/vendor/css/"
cp -fr "node_modules/font-awesome/fonts/" "src/vendor/"
