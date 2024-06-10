import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs'
// import {eslint} from "rollup-plugin-eslint";
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
        globals: {
            "vue": "Vue",
            "vue-class-component": "VueClassComponent",
        },
    },
    treeshake: false,
    external: ["vue", "vue-class-component"],
    plugins: [
        resolve(),
        commonjs(),
        VuePlugin({
            template: {
                transformAssetUrls: {
                    img: [],
                },
                isProduction: false,
            },
        }),
        /*eslint({
            include: "src-**-*.ts",
            exclude: [
                "node_modules/**",
                "**-*.vue*",
            ],
        }),*/
        typescript({
            tsconfig: "src/tsconfig.json",
        }),
    ],
}));
