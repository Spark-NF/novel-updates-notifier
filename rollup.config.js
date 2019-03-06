import tslint from "rollup-plugin-tslint";
import typescript from 'rollup-plugin-typescript';

const files = {
    "src/background/background.ts": "src/background/bundle.js",
    "src/popup/popup.ts": "src/popup/bundle.js",
    "src/options/options.ts": "src/options/bundle.js",
    "src/options/groups.ts": "src/options/groups.js",
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
        },
    },
    external: ["vue"],
    plugins: [
        tslint({
            tsConfigSearchPath: "src",
            configuration: "src/tslint.json",
        }),
        typescript({
            tsconfig: "src/tsconfig.json",
        }),
    ],
}));
