import { defineConfig } from "vite";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
export default defineConfig({
  plugins: [
    {
      name: "calendar-offline-shell",
      generateBundle(_, bundle) {
        const assets = Object.keys(bundle)
          .filter(
            (name) => name.startsWith("assets/") && /\.(js|css)$/.test(name),
          )
          .map((name) => "/" + name);
        const version = createHash("sha256")
          .update(assets.join(","))
          .digest("hex")
          .slice(0, 12);
        const source = readFileSync(
          new URL("./src/service-worker.js", import.meta.url),
          "utf8",
        )
          .replace("self.__CACHE_VERSION__", JSON.stringify(version))
          .replace(
            "self.__PRECACHE__",
            JSON.stringify([
              "/",
              "/manifest.webmanifest",
              "/icon-192.png",
              "/icon-512.png",
              ...assets,
            ]),
          );
        this.emitFile({ type: "asset", fileName: "sw.js", source });
      },
    },
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("@firebase") || id.includes("/firebase/"))
              return "firebase";
            return "vendor";
          }
        },
      },
    },
  },
});
