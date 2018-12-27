module.exports = function(config) {
    config.set({
        frameworks: ["jasmine"],

        files: [
            "src/spec_bundle.js"
        ],
        preprocessors: {
            "src/spec_bundle.js": ["coverage"]
        },

        reporters: ["spec", "coverage"],
        coverageReporter: {
            type: "json",
            dir: "coverage",
            subdir: ".",
            file: "coverage-js-bundle.json"
        },

        port: 9876,
        colors: true,
        logLevel: config.LOG_INFO,
        autoWatch: false,

        browsers: ["ChromeHeadless"],

        singleRun: true,
        concurrency: 5
    })
}
