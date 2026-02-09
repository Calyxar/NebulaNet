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

function copyDir(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return 0;

  ensureDir(destDir);
  let count = 0;

  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const src = path.join(srcDir, entry.name);
    const dest = path.join(destDir, entry.name);

    if (entry.isDirectory()) {
      count += copyDir(src, dest);
    } else {
      copyFile(src, dest);
      count++;
    }
  }

  return count;
}

// ---- checks ----
if (!fs.existsSync(distDir)) {
  console.error("❌ dist/ not found. Run expo export first.");
  process.exit(1);
}

if (!fs.existsSync(publicDir)) {
  console.log("ℹ️ public/ not found. Nothing to copy.");
  process.exit(0);
}

// ---- copy .html files ----
const htmlFiles = fs.readdirSync(publicDir).filter((f) => f.endsWith(".html"));

for (const f of htmlFiles) {
  copyFile(path.join(publicDir, f), path.join(distDir, f));
}

// ---- copy .well-known (assetlinks.json) ----
const wellKnownSrc = path.join(publicDir, ".well-known");
const wellKnownDest = path.join(distDir, ".well-known");
const wellKnownCount = copyDir(wellKnownSrc, wellKnownDest);

console.log(
  `Done. Copied ${htmlFiles.length} HTML file(s) and ${wellKnownCount} .well-known file(s).`,
);
