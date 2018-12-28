import multiEntry from "rollup-plugin-multi-entry";

export default {
    input: "src/**/*.spec.js",
    plugins: [multiEntry()],
    output: {
        sourcemap: true,
    },
};
