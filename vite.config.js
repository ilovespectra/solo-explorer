import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import pkg from "./package.json";

const heliusKey = process.env.HELIUS_API_KEY;

export default defineConfig(({ mode }) => ({
    build: {
        target: "es2020",
    },
    define: {
        APP_NAME: JSON.stringify(pkg.name),
        APP_VERSION: JSON.stringify(pkg.version),
        "process.env.NODE_DEBUG": false,
    },
    optimizeDeps: {
        esbuildOptions: {
            target: "es2020",
        },
    },
    plugins: [sveltekit()],
}));
