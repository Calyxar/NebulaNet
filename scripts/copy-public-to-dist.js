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

// ✅ 1) Copy all .html files anywhere under /public
const allFiles = walk(publicDir);

const htmlFiles = allFiles.filter((absPath) => {
  const rel = path.relative(publicDir, absPath).replace(/\\/g, "/");
  return rel.endsWith(".html");
});

for (const src of htmlFiles) {
  const rel = path.relative(publicDir, src);
  const dest = path.join(distDir, rel);
  copyFile(src, dest);
}

// ✅ 2) ALWAYS explicitly copy Android App Links file (dot-folder safe)
const assetlinksSrc = path.join(publicDir, ".well-known", "assetlinks.json");
const assetlinksDest = path.join(distDir, ".well-known", "assetlinks.json");

if (fs.existsSync(assetlinksSrc)) {
  copyFile(assetlinksSrc, assetlinksDest);
} else {
  console.warn(
    "⚠️  Missing: public/.well-known/assetlinks.json (App Links will 404)",
  );
}

console.log(
  `Done. Copied ${htmlFiles.length + (fs.existsSync(assetlinksSrc) ? 1 : 0)} file(s).`,
);
