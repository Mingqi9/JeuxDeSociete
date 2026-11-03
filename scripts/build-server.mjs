import { build } from "esbuild";
await build({
  entryPoints: ["server/main.ts"],
  outfile: ".server-build/main.mjs",
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  packages: "external",
});
