import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const demoPath = (name) => fileURLToPath(new URL(`./demo/${name}`, import.meta.url));

export default defineConfig({
  root: demoPath(""),
  base: "/SST-SAAS-DEMO/",
  envPrefix: [],
  publicDir: false,
  plugins: [react()],
  resolve: {
    alias: [
      { find: /^\.\.\/context\/AuthContext\.jsx$/, replacement: demoPath("session.jsx") },
      { find: /^(\.\/client|\.\.\/api\/client)\.js$/, replacement: demoPath("client.js") },
    ],
  },
  build: { outDir: "../dist", emptyOutDir: true },
});
