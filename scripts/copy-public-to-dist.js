// scripts/copy-public-to-dist.js
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const publicDir = path.join(root, "public");
const distDir = path.join(root, "dist");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);

  if (stat.isDirectory()) {
    ensureDir(dest);
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
    return;
  }

  // file
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
  console.log(`Copied: ${src} -> ${dest}`);
}

if (!fs.existsSync(distDir)) {
  console.error("dist/ not found. Run expo export first.");
  process.exit(1);
}

if (!fs.existsSync(publicDir)) {
  console.log("public/ not found. Nothing to copy.");
  process.exit(0);
}

copyRecursive(publicDir, distDir);
console.log("Done. Copied public/ -> dist/");
