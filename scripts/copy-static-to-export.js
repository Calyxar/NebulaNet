// scripts/copy-static-to-export.js
const fs = require("fs");
const path = require("path");

function exists(p) {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
  console.log(`Copied: ${src} -> ${dest}`);
}

function findExportDir(root) {
  const candidates = ["dist", "web-build", "build", "out"].map((d) =>
    path.join(root, d),
  );
  const found = candidates.find(
    (d) => exists(d) && exists(path.join(d, "index.html")),
  );
  if (!found) return null;
  return found;
}

function main() {
  const root = process.cwd();
  const exportDir = findExportDir(root);

  if (!exportDir) {
    console.error(
      "Could not find Expo web export directory (looked for dist/, web-build/, build/, out/ with index.html).",
    );
    process.exit(1);
  }

  console.log(
    `Detected export output directory: ${path.relative(root, exportDir)}/`,
  );

  const pub = path.join(root, "public");
  const files = ["privacy.html"];

  for (const f of files) {
    const src = path.join(pub, f);
    if (!exists(src)) {
      console.warn(`Missing: ${src}`);
      continue;
    }
    copyFile(src, path.join(exportDir, f));
  }
}

main();
