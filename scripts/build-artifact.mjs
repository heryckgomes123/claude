// Builds AIVA as ONE self-contained HTML file (artifact/dist/aiva.html) that runs in the
// claude.ai artifact viewer: same screens and AI engine, browser-side "API", private synced storage.
import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const r = (p) => path.join(root, p);

const aliases = {
  "@/lib/client-api": r("artifact/backend/api.ts"),
  "@/lib/nav": r("artifact/shims/nav.ts"),
  "@/db": r("artifact/shims/db-stub.ts"),
  "server-only": r("artifact/shims/empty.ts"),
  "next/link": r("artifact/shims/next-link.tsx"),
  "next/navigation": r("artifact/shims/next-navigation.ts"),
};

const standalone = {
  name: "aiva-standalone",
  setup(b) {
    b.onResolve({ filter: /.*/ }, (args) => {
      if (aliases[args.path]) return { path: aliases[args.path] };
      // The offline AI engine imports its executor relatively; use the browser executor.
      if (args.path === "./execute" && args.importer.includes(path.join("src", "lib", "server", "ai"))) return { path: r("artifact/backend/execute.ts") };
      return undefined;
    });
  },
};

const js = await build({
  entryPoints: [r("artifact/main.tsx")],
  bundle: true,
  write: false,
  minify: true,
  format: "iife",
  target: ["es2020", "safari15"],
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  plugins: [standalone],
  tsconfig: r("tsconfig.json"),
  logLevel: "warning",
});
const bundle = js.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");

const cssIn = await readFile(r("artifact/artifact.css"), "utf8");
const css = await postcss([tailwind({ base: root, optimize: { minify: true } })]).process(cssIn, { from: r("artifact/artifact.css") });

const html = `<title>AIVA</title>
<meta name="theme-color" content="#07070c">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap">
<style>${css.css}</style>
<div id="root"></div>
<script>window.__AIVA_EMBED=true;window.__AIVA_NO_MIC=true;</script>
<script>${bundle}</script>
`;
await mkdir(r("artifact/dist"), { recursive: true });
await writeFile(r("artifact/dist/aiva.html"), html);
console.log(`artifact/dist/aiva.html  ${(html.length / 1024).toFixed(0)} KB`);
