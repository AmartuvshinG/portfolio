// Starts `next dev`, waits until the server prints its Local URL, then opens
// that URL in Google Chrome (once). Set BROWSER=none to skip auto-opening.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const CHROME_PATHS = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  `${process.env.LOCALAPPDATA || ""}/Google/Chrome/Application/chrome.exe`,
];

function findChrome() {
  return CHROME_PATHS.find((p) => p && existsSync(p));
}

let opened = false;
function openInChrome(url) {
  if (opened || process.env.BROWSER === "none") return;
  opened = true;

  const chrome = findChrome();
  if (chrome) {
    spawn(chrome, [url], { detached: true, stdio: "ignore" }).unref();
    console.log(`\n▲ Opened ${url} in Google Chrome\n`);
  } else {
    // Fallback: default browser
    spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore" }).unref();
    console.log(`\n▲ Chrome not found — opened ${url} in your default browser\n`);
  }
}

// Run the Next dev server via the current Node executable + resolved Next CLI.
// This works whether launched by `npm run dev` or `node scripts/dev-open.mjs`,
// with no shell and no PATH assumptions.
const nextBin = require.resolve("next/dist/bin/next");
const child = spawn(process.execPath, [nextBin, "dev", ...process.argv.slice(2)], {
  stdio: ["inherit", "pipe", "pipe"],
});

const URL_RE = /(https?:\/\/(?:localhost|127\.0\.0\.1):\d+)/;

function watch(stream, out) {
  stream.on("data", (chunk) => {
    out.write(chunk);
    if (!opened) {
      const match = String(chunk).match(URL_RE);
      if (match) openInChrome(match[1]);
    }
  });
}

watch(child.stdout, process.stdout);
watch(child.stderr, process.stderr);

// Forward Ctrl+C and exit codes so it behaves like running next directly.
const stop = () => child.kill("SIGINT");
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
child.on("exit", (code) => process.exit(code ?? 0));
