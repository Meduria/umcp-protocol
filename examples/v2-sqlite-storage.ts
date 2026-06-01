// ============================================================
// UMCP — Example: Using v2 SQLite Storage
// ============================================================
//
// Same workflow as v1 but backed by SQLite.
// Faster for large memory stores and supports advanced filtering.
//
// Install dependency first:
//   npm install better-sqlite3
//
// Run:
//   npx ts-node examples/v2-sqlite-storage.ts
// ------------------------------------------------------------

import { UMCPClient, SQLiteStorage } from "umcp-core";

async function main() {
  // ── Setup ──────────────────────────────────────────────
  const client = new UMCPClient({
    storage: new SQLiteStorage(), // saves to ~/.umcp/memory.db

    // Optional: tune the scoring weights
    weights: {
      alpha: 0.7, // prioritise keyword similarity more
      beta: 0.2,  // recency matters less
      gamma: 0.1, // graph proximity stays the same
    },
  });

  console.log("=== UMCP v2 — SQLite Storage ===\n");

  // ── STORE — simulate a real multi-session workflow ──────
  console.log("▶ Simulating memory from multiple past sessions...\n");

  const p1 = await client.store({
    type: "project",
    content: "UMCP protocol library — open source TypeScript implementation",
    metadata: { repo: "umcp-protocol", stack: ["TypeScript", "Node.js"] },
  });

  const d1 = await client.store({
    type: "decision",
    content: "Use JSON file as v1 storage backend — zero dependencies",
    relations: [p1.id],
  });

  const d2 = await client.store({
    type: "decision",
    content: "Use SQLite as v2 storage backend via better-sqlite3",
    relations: [p1.id],
  });

  const e1 = await client.store({
    type: "event",
    content: "Published umcp-core v0.1.0 to npm",
    relations: [p1.id],
    metadata: { date: "2024-06-01" },
  });

  const a1 = await client.store({
    type: "artifact",
    content: "MemoryNode TypeScript interface with id, type, content, relations, createdAt",
    relations: [p1.id, d1.id, d2.id],
  });

  console.log(`  Stored ${5} nodes across project, decisions, event, artifact.\n`);

  // ── QUERY — what does another AI tool see? ──────────────
  console.log("▶ Another tool queries: 'what storage options exist?'\n");

  const result = await client.query({
    task: "what storage options exist?",
    limit: 3,
  });

  result.nodes.forEach((node, i) => {
    console.log(`  #${i + 1} [${node.type}] score=${result.scores[i].toFixed(3)}`);
    console.log(`       ${node.content}\n`);
  });

  // ── SQLite-specific: filter by type ─────────────────────
  console.log("▶ SQLite extra: get all decision nodes directly\n");

  const sqliteStorage = client["storage"] as SQLiteStorage;
  const decisions = await sqliteStorage.getByType("decision");
  decisions.forEach((d) => console.log("  [decision]", d.content));

  // ── SQLite-specific: date range query ───────────────────
  console.log("\n▶ SQLite extra: nodes created in the last 60 seconds\n");

  const recent = await sqliteStorage.getByDateRange(
    Date.now() - 60_000,
    Date.now()
  );
  console.log(`  Found ${recent.length} recent nodes.`);

  console.log("\n✅ Done. Check ~/.umcp/memory.db for the SQLite database.");
}

main().catch(console.error);
