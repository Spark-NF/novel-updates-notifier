#!/usr/bin/env bash

set -e

karma start

pushd src
    remap-istanbul -i "../coverage/coverage-js-bundle.json" -o "../coverage/coverage-js.json" -t "json"
    remap-istanbul -i "../coverage/coverage-js.json" -e ".spec.ts" -o "../coverage/html" -t "html"
popd
