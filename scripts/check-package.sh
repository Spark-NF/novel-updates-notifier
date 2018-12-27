#!/usr/bin/env bash

VERSION=`jq -r '.version' manifest.json`
FIREFOX_PACKAGE="packages/novel-updates-notifier-$VERSION-firefox.xpi"

./node_modules/.bin/addons-linter "$FIREFOX_PACKAGE"
