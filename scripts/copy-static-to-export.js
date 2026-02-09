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

  return candidates.find(
    (dir) => exists(dir) && exists(path.join(dir, "index.html")),
  );
}

/**
 * Copies:
 *  public/<file>.html        -> dist/<file>.html
 *  public/<file>.html        -> dist/<slug>/index.html
 * This guarantees BOTH:
 *  - /page.html
 *  - /page   (clean URL)
 */
function copyStaticPage({ exportDir, publicDir, file, slug }) {
  const src = path.join(publicDir, file);
  if (!exists(src)) {
    console.warn(`⚠️  Missing static page: ${src}`);
    return;
  }

  // Standard .html
  copyFile(src, path.join(exportDir, file));

  // Clean URL version
  copyFile(src, path.join(exportDir, slug, "index.html"));
}

function main() {
  const root = process.cwd();
  const exportDir = findExportDir(root);

  if (!exportDir) {
    console.error(
      "❌ Could not find Expo web export directory (dist/, web-build/, build/, out/ with index.html).",
    );
    process.exit(1);
  }

  console.log(
    `📁 Detected export output directory: ${path.relative(root, exportDir)}/`,
  );

  const publicDir = path.join(root, "public");

  // ✅ Google Play required pages
  copyStaticPage({
    exportDir,
    publicDir,
    file: "child-safety.html",
    slug: "child-safety",
  });

  copyStaticPage({
    exportDir,
    publicDir,
    file: "delete-account.html",
    slug: "delete-account",
  });

  // ✅ Common/legal pages
  copyStaticPage({
    exportDir,
    publicDir,
    file: "privacy.html",
    slug: "privacy",
  });
}

main();
