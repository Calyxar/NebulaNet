#!/usr/bin/env node
// Run this from your project root:
//   node apply-font-scale.js
//
// Transforms all target screens to use fs() from useTheme for font scaling.
// Safe to re-run — skips files already transformed.

const fs_node = require("fs");
const path = require("path");

const TARGET_FILES = [
  "app/(tabs)/home.tsx",
  "app/(tabs)/profile.tsx",
  "app/post/[id].tsx",
  "app/user/[username].tsx",
  "app/notifications/index.tsx",
  "app/boost/index.tsx",
  "app/boost/[postId]/review.tsx",
];

function transform(source, filePath) {
  const fileName = path.basename(filePath);

  // Skip if already transformed
  if (source.includes("makeStyles")) {
    console.log(`  ⏭  ${fileName} — already transformed, skipping`);
    return null;
  }

  // 1. Add fs to useTheme destructure
  let out = source.replace(
    /const \{ (colors,\s*isDark)\s*\} = useTheme\(\);/,
    "const { $1, fs } = useTheme();"
  );

  // Handle variant destructure orders
  out = out.replace(
    /const \{ (colors,\s*isDark,\s*theme)\s*\} = useTheme\(\);/,
    "const { $1, fs } = useTheme();"
  );

  // 2. Add useMemo for styles right after the useTheme line
  out = out.replace(
    /(const \{ colors,\s*isDark(?:,\s*\w+)?,?\s*fs \} = useTheme\(\);)/,
    "$1\n  const styles = useMemo(() => makeStyles(fs), [fs]);"
  );

  // 3. Make sure useMemo is in the React import
  if (!out.match(/useMemo/) || !out.match(/import React.*useMemo/)) {
    out = out.replace(
      /import React, \{([^}]+)\}/,
      (match, inner) => {
        if (inner.includes("useMemo")) return match;
        return `import React, {${inner.trimEnd()}, useMemo}`;
      }
    );
  }

  // 4. Rename StyleSheet.create to makeStyles factory
  out = out.replace(
    /^const styles = StyleSheet\.create\(\{/m,
    "const makeStyles = (fs: (n: number) => number) => StyleSheet.create({"
  );

  // 5. Replace all fontSize: NUMBER inside the styles block with fontSize: fs(NUMBER)
  // We do this by finding the makeStyles block and transforming only inside it
  const makeStylesIdx = out.indexOf("const makeStyles = ");
  if (makeStylesIdx !== -1) {
    // Find the end of the StyleSheet.create block
    let depth = 0;
    let inBlock = false;
    let blockStart = -1;
    let blockEnd = -1;

    for (let i = makeStylesIdx; i < out.length; i++) {
      if (out[i] === "{") {
        if (!inBlock) { inBlock = true; blockStart = i; }
        depth++;
      } else if (out[i] === "}") {
        depth--;
        if (depth === 0 && inBlock) { blockEnd = i; break; }
      }
    }

    if (blockStart !== -1 && blockEnd !== -1) {
      const before = out.slice(0, blockStart);
      const block = out.slice(blockStart, blockEnd + 1);
      const after = out.slice(blockEnd + 1);

      const transformedBlock = block.replace(
        /fontSize:\s*(\d+\.?\d*)/g,
        (_, num) => `fontSize: fs(${num})`
      );

      out = before + transformedBlock + after;
    }
  }

  return out;
}

let transformedCount = 0;

for (const filePath of TARGET_FILES) {
  const absPath = path.resolve(process.cwd(), filePath);

  if (!fs_node.existsSync(absPath)) {
    console.log(`  ⚠️  Not found: ${filePath}`);
    continue;
  }

  const source = fs_node.readFileSync(absPath, "utf8");
  const result = transform(source, filePath);

  if (result === null) continue; // skipped

  fs_node.writeFileSync(absPath, result, "utf8");
  console.log(`  ✅  Transformed: ${filePath}`);
  transformedCount++;
}

console.log(`\nDone — ${transformedCount} file(s) transformed.`);
