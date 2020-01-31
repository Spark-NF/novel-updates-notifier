import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs'
import tslint from "rollup-plugin-tslint";
import typescript from 'rollup-plugin-typescript';
import VuePlugin from "rollup-plugin-vue";

const files = {
    "src/background/background.ts": "src/background/bundle.js",
    "src/popup/popup.ts": "src/popup/bundle.js",
    "src/options/options.ts": "src/options/bundle.js",
    "src/sidebar/sidebar.ts": "src/sidebar/bundle.js",
    "src/userstyles/apply.ts": "src/userstyles/bundle.js",
};

export default Object.keys(files).map(input => ({
    input,
    output: {
        file: files[input],
        format: "iife",
        treeshake: false,
        globals: {
            "vue": "Vue",
            "vue-class-component": "VueClassComponent",
        },
    },
    external: ["vue", "vue-class-component"],
    plugins: [
        resolve(),
        commonjs(),
        VuePlugin({
            template: {
                isProduction: false,
            },
        }),
        tslint({
            tsConfigSearchPath: "src",
            configuration: "src/tslint.json",
            exclude: [
                "node_modules/**",
                "**/*.vue*",
            ],
        }),
        typescript({
            tsconfig: "src/tsconfig.json",
        }),
    ],
}));
