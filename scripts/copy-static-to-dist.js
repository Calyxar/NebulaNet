// scripts/copy-static-to-dist.js
const fs = require("fs");
const path = require("path");

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  console.log(`Copied: ${src} -> ${dest}`);
}

function main() {
  const root = process.cwd();
  const dist = path.join(root, "dist");
  const pub = path.join(root, "public");

  if (!fs.existsSync(dist)) {
    console.error("dist/ not found. Run your web export first.");
    process.exit(1);
  }

  // Copy any html files you want publicly accessible
  const filesToCopy = ["privacy.html", "post.html"]; // add more if you want

  for (const f of filesToCopy) {
    const src = path.join(pub, f);
    if (fs.existsSync(src)) {
      copyFile(src, path.join(dist, f));
    } else {
      console.warn(`Skipping (not found): ${src}`);
    }
  }
}

main();
