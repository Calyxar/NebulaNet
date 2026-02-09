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

function copyDirRecursive(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return;
  ensureDir(destDir);

  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const src = path.join(srcDir, entry.name);
    const dest = path.join(destDir, entry.name);

    if (entry.isDirectory()) copyDirRecursive(src, dest);
    else copyFile(src, dest);
  }
}

if (!fs.existsSync(distDir)) {
  console.error("dist/ not found. Run expo export first.");
  process.exit(1);
}

if (!fs.existsSync(publicDir)) {
  console.log("public/ not found. Nothing to copy.");
  process.exit(0);
}

// ✅ copy root .html files
const htmlFiles = fs.readdirSync(publicDir).filter((f) => f.endsWith(".html"));
for (const f of htmlFiles) {
  copyFile(path.join(publicDir, f), path.join(distDir, f));
}
console.log(`Done. Copied ${htmlFiles.length} html file(s).`);

// ✅ copy /.well-known/* (assetlinks.json)
copyDirRecursive(
  path.join(publicDir, ".well-known"),
  path.join(distDir, ".well-known"),
);
