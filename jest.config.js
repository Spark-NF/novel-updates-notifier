export default {
    preset: "ts-jest",
    testEnvironment: "jest-environment-jsdom",

    testMatch: [
        "**/?(*.)+(spec|test).ts"
    ],

    coveragePathIgnorePatterns: [
        "/Fake*",
    ],
    coverageReporters: [
        "lcovonly",
        "html",
    ],

    collectCoverageFrom: [
        "src/**/*.ts",
    ],

    transform: {
        "^.+\\.tsx?$": [
            "ts-jest",
            {
                diagnostics: false,
                tsconfig: "src/tsconfig.json"
            },
        ],
    },
};
