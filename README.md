<p align="center"><img src="icons/icon-96.png" alt="" /></p>

<h1 align="center">Novel Updates Notifier add-on</h1>

[![Firefox add-on version](https://img.shields.io/amo/v/novel-updates-notifier.svg)](https://addons.mozilla.org/en-US/firefox/addon/novel-updates-notifier/)
[![Chrome add-on version](https://img.shields.io/chrome-web-store/v/plhhbkakiaffbinchcacleepogbjlban.svg)](https://chrome.google.com/webstore/detail/novel-updates-notifier/plhhbkakiaffbinchcacleepogbjlban)
[![Build Status](https://travis-ci.org/Spark-NF/novel-updates-notifier.svg?branch=master)](https://travis-ci.org/Spark-NF/novel-updates-notifier)
[![Code Coverage](https://img.shields.io/codecov/c/github/Spark-NF/novel-updates-notifier.svg)](https://codecov.io/gh/Spark-NF/novel-updates-notifier)
[![Project license](https://img.shields.io/github/license/Spark-NF/novel-updates-notifier.svg)](https://raw.githubusercontent.com/Spark-NF/novel-updates-notifier/master/LICENSE)

## About
Add-on that notifies you when a novel from your reading list has a new chapter available.

As a WebExtension, it is compatible with both Chrome and Firefox.

### Features
* Checks when new chapters are out for the novels in your reading list
* Notifies you via the extension's badge and optional notifications
* Can open chapters in sidebar (Firefox only)
* Can enable a custom CSS for a few reading sites (supported: WuxiaWorld, WebNovel)
* Can automatically mark chapters as read

### Authors
* Nicolas Faure ([Spark-NF](https://github.com/Spark-NF))

### License
The script is licensed under the [Apache License 2.0](http://www.apache.org/licenses/LICENSE-2.0).

## Building
Note: you need to have [NodeJS](https://nodejs.org/), `zip`, and [JQ](https://stedolan.github.io/jq/) installed to build the add-on.

```
npm install
npm run build
npm run package
```

You'll find the built packages in the `packages` directory.