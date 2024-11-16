import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs'
// import {eslint} from "rollup-plugin-eslint";
import typescript from 'rollup-plugin-typescript';
import vuePlugin from "rollup-plugin-vue";

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
        },
    },
    treeshake: false,
    external: ["vue"],
    plugins: [
        resolve(),
        commonjs(),
        vuePlugin({
            target: "browser",
            transformAssetUrls: {
                img: [],
            },
            isProduction: false,
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
