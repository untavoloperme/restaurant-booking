import esbuild from "esbuild";
import { mkdirSync } from "fs";

mkdirSync("public", { recursive: true });

await esbuild.build({
  entryPoints: ["widget-loader/src/loader.ts"],
  bundle: true,
  minify: true,
  outfile: "public/widget-loader.js",
  format: "iife",
  target: ["es2017"],
  platform: "browser",
});

console.log("✔ widget-loader.js built → public/widget-loader.js");
