// ============================================================
// UMCP — Example: Using v1 JSON File Storage
// ============================================================
//
// This example shows the full lifecycle of a memory node:
// store → query → update → delete
//
// Storage: a single JSON file at ~/.umcp/memory.json
// No external dependencies needed.
//
// Run:
//   npx ts-node examples/v1-json-storage.ts
// ------------------------------------------------------------

import { UMCPClient, JsonFileStorage } from "umcp-core";

async function main() {
  // ── Setup ──────────────────────────────────────────────
  const client = new UMCPClient({
    storage: new JsonFileStorage(), // saves to ~/.umcp/memory.json
  });

  console.log("=== UMCP v1 — JSON File Storage ===\n");

  // ── STORE ──────────────────────────────────────────────
  console.log("▶ Storing memory nodes...\n");

  const project = await client.store({
    type: "project",
    content: "Building an e-commerce platform with Next.js and PostgreSQL",
    metadata: { name: "shopify-clone", team: "backend" },
  });
  console.log("  [project]  ", project.content);

  const decision = await client.store({
    type: "decision",
    content: "Switched from MongoDB to PostgreSQL for better relational queries",
    relations: [project.id], // links to the project node
  });
  console.log("  [decision] ", decision.content);

  const preference = await client.store({
    type: "preference",
    content: "Always use TypeScript strict mode. Prefer async/await over callbacks.",
  });
  console.log("  [preference]", preference.content);

  const artifact = await client.store({
    type: "artifact",
    content: "users table schema: id, email, password_hash, created_at",
    relations: [project.id, decision.id],
  });
  console.log("  [artifact] ", artifact.content);

  // ── QUERY ──────────────────────────────────────────────
  console.log("\n▶ Querying context for: 'build authentication system'\n");

  const result = await client.query({
    task: "build authentication system",
    limit: 3,
  });

  result.nodes.forEach((node, i) => {
    console.log(`  #${i + 1} [${node.type}] score=${result.scores[i].toFixed(3)}`);
    console.log(`       ${node.content}\n`);
  });

  // ── UPDATE ─────────────────────────────────────────────
  console.log("▶ Updating the decision node...\n");

  const updated = await client.update(decision.id, {
    content: "Using PostgreSQL with Prisma ORM for type-safe queries",
  });
  console.log("  Updated:", updated?.content);

  // ── DELETE ─────────────────────────────────────────────
  console.log("\n▶ Deleting the preference node...");
  const deleted = await client.delete(preference.id);
  console.log("  Deleted:", deleted);

  // ── FINAL STATE ────────────────────────────────────────
  console.log("\n▶ All nodes remaining in memory:\n");
  const all = await client.getAll();
  all.forEach((n) => {
    console.log(`  [${n.type}] ${n.id.slice(0, 8)}... — ${n.content.slice(0, 60)}`);
  });

  console.log("\n✅ Done. Check ~/.umcp/memory.json to see the stored data.");
}

main().catch(console.error);
