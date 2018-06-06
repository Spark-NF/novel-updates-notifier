#!/usr/bin/env bash

tslint -c "src/tslint.json" -p "src/background/tsconfig.json"
tslint -c "src/tslint.json" -p "src/popup/tsconfig.json"
