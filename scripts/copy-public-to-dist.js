// scripts/copy-public-to-dist.js
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const publicDir = path.join(root, "public");
const distDir = path.join(root, "dist");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
  console.log(`Copied: ${src} -> ${dest}`);
}

function walk(dir) {
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

if (!fs.existsSync(distDir)) {
  console.error("dist/ not found. Run expo export first.");
  process.exit(1);
}

if (!fs.existsSync(publicDir)) {
  console.log("public/ not found. Nothing to copy.");
  process.exit(0);
}

// ✅ Copy only what you want deployed from /public
// - all .html files anywhere
// - AND public/.well-known/assetlinks.json (required for Android App Links)
const allFiles = walk(publicDir);

const allow = (absPath) => {
  const rel = path.relative(publicDir, absPath).replace(/\\/g, "/");

  // allow any html pages
  if (rel.endsWith(".html")) return true;

  // allow the Android App Links file
  if (rel === ".well-known/assetlinks.json") return true;

  return false;
};

const selected = allFiles.filter(allow);

for (const src of selected) {
  const rel = path.relative(publicDir, src);
  const dest = path.join(distDir, rel);
  copyFile(src, dest);
}

console.log(`Done. Copied ${selected.length} file(s).`);
