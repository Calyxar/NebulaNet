// scripts/algolia-sync-synonyms.ts ✅ FIXED for algoliasearch v5
// ✅ FIXED: this project has algoliasearch v5 installed, not v4 — v5 is a
// full API redesign, not just an import-path change:
//   - Default export removed → `import { algoliasearch } from "algoliasearch"`
//   - `client.initIndex(name)` removed entirely — every method now takes
//     `indexName` directly as a parameter on the client instance
//   - `saveSynonyms([...])` on an index object → `client.saveSynonyms({
//     indexName, synonymHit: [...] })` on the client itself
//   - `index.waitTask(taskID)` removed → use the client's `waitForTask`
//     helper instead
// Confirmed against Algolia's official v4→v5 migration guide rather than
// guessing at the new shape from the error message alone.
//
// One-time / occasionally-re-run script to push synonym definitions to
// the Algolia index. NOT part of the app bundle — this uses the Algolia
// Admin API key, which can write/delete the entire index and must never
// ship in client code (unlike the search-only key already used in
// hooks/useSearch.ts for read queries).
//
// Run with: npx ts-node scripts/algolia-sync-synonyms.ts
//
// Requires these in your .env (already has the admin key per your setup):
//   ALGOLIA_APP_ID=...
//   ALGOLIA_ADMIN_API_KEY=...
//   ALGOLIA_INDEX_NAME=posts   ← confirmed via the Algolia dashboard
//                                (Search → Index dropdown → "posts" —
//                                the community listings index is a
//                                separate one called "communities", not
//                                this one)

import { algoliasearch } from "algoliasearch";
import "dotenv/config";

const APP_ID = process.env.ALGOLIA_APP_ID;
const ADMIN_KEY = process.env.ALGOLIA_ADMIN_API_KEY;
const INDEX_NAME = process.env.ALGOLIA_INDEX_NAME;

if (!APP_ID || !ADMIN_KEY || !INDEX_NAME) {
  console.error(
    "Missing ALGOLIA_APP_ID, ALGOLIA_ADMIN_API_KEY, or ALGOLIA_INDEX_NAME in .env — aborting.",
  );
  process.exit(1);
}

// ✅ Synonym groups — each inner array is a set of interchangeable terms.
// This list is meant to be edited/expanded over time as you notice real
// search terms people use that don't match your post content's wording.
// Not exhaustive by design — start small, add groups as real search
// misses surface them, rather than trying to anticipate everything up
// front.
const SYNONYM_GROUPS: string[][] = [
  // Mood / feelings — common informal phrasing people search with
  ["sad", "depressed", "down", "struggling", "upset"],
  ["happy", "excited", "stoked", "hyped", "pumped"],
  ["angry", "mad", "pissed", "frustrated", "annoyed"],
  ["tired", "exhausted", "burnt out", "burned out", "drained"],

  // Common shorthand / abbreviations
  ["photo", "pic", "picture", "image"],
  ["video", "vid", "clip"],
  ["community", "group", "server"],

  // Generic topic clusters — replace/expand with terms that actually
  // match what people post about on NebulaNet
  ["car", "vehicle", "automobile"],
  ["job", "career", "work"],
  ["money", "cash", "finances"],
];

async function main() {
  // ✅ v5: named export, and the client itself (not an index object)
  // exposes all methods.
  const client = algoliasearch(APP_ID!, ADMIN_KEY!);

  const synonymHit = SYNONYM_GROUPS.map((group, i) => ({
    objectID: `synonym-group-${i}`,
    type: "synonym" as const,
    synonyms: group,
  }));

  console.log(
    `Pushing ${synonymHit.length} synonym groups to index "${INDEX_NAME}"...`,
  );

  // ✅ v5: saveSynonyms is a client method taking { indexName, synonymHit },
  // not index.saveSynonyms([...]). replaceExistingSynonyms: false so this
  // adds/updates by objectID without wiping unrelated synonyms you may
  // have set manually in the dashboard. (Algolia's docs describe this as
  // `clearExistingSynonyms` in prose, but the actual installed package's
  // types disagree — trusting the compiler over the doc wording here.)
  const { taskID } = await client.saveSynonyms({
    indexName: INDEX_NAME!,
    synonymHit,
    forwardToReplicas: true,
    replaceExistingSynonyms: false,
  });

  // ✅ v5: index.waitTask(taskID) was removed — use the client's
  // waitForTask helper, which needs indexName too.
  await client.waitForTask({ indexName: INDEX_NAME!, taskID });

  console.log("Done — synonyms are live on the index.");
}

main().catch((err) => {
  console.error("Failed to sync synonyms:", err);
  process.exit(1);
});
