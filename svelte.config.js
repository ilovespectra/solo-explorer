import adapter from "@sveltejs/adapter-vercel";
import preprocess from "svelte-preprocess";

/** @type {import("@sveltejs/kit").Config} */
const config = {
    kit: {
        // Explicitly specify the Node.js 20 runtime
        adapter: adapter({
            runtime: "nodejs20.x",
        }),
    },
    preprocess: [
        preprocess({
            postcss: true,
            // The `tsconfigFile` option is typically not needed for svelte-preprocess
        }),
    ],
};

export default config;
