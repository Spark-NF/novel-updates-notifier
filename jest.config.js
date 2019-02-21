module.exports = {
    preset: "ts-jest",
    testEnvironment: "jest-environment-jsdom",

    testMatch: [
        "**/?(*.)+(spec|test).ts"
    ],

    coverageReporters: [
        "lcovonly",
        "html",
    ],

    globals: {
        "ts-jest": {
            diagnostics: false,
            tsConfig: "src/tsconfig.json"
        }
    }
};