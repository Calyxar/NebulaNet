const fs = require("fs");
const path = require("path");

const root = process.cwd();
const publicDir = path.join(root, "public");
const distDir = path.join(root, "dist");

if (!fs.existsSync(distDir)) {
  console.error("dist/ not found. Run expo export first.");
  process.exit(1);
}

if (!fs.existsSync(publicDir)) {
  console.log("public/ not found. Nothing to copy.");
  process.exit(0);
}

// copy ONLY .html files (privacy.html, child-safety.html, delete-account.html, etc)
const files = fs.readdirSync(publicDir).filter((f) => f.endsWith(".html"));

for (const f of files) {
  const src = path.join(publicDir, f);
  const dest = path.join(distDir, f);
  fs.copyFileSync(src, dest);
  console.log(`Copied: ${src} -> ${dest}`);
}

console.log(`Done. Copied ${files.length} file(s).`);
