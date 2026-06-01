// ============================================================
// UMCP — Storage Backend v2: SQLite
// ============================================================
//
// A production-grade storage backend using SQLite via better-sqlite3.
//
// ✅ Pros:
//   - Fast indexed queries (no full-file scan)
//   - Handles thousands of nodes efficiently
//   - ACID transactions — safe concurrent reads
//   - Still fully local-first (single .db file on disk)
//   - Can filter by type, date range, metadata in SQL
//
// ⚠️ Cons:
//   - Requires `better-sqlite3` npm dependency
//   - Slightly more setup than JSON
//
// Install dependency:
//   npm install better-sqlite3
//   npm install -D @types/better-sqlite3
//
// Best for: production use, large memory stores, multi-tool setups.
// ------------------------------------------------------------

import path from "path";
import type { MemoryNode, StorageBackend } from "./types.js";

// We import better-sqlite3 lazily so the JSON backend
// works without it installed.
type Database = import("better-sqlite3").Database;

export class SQLiteStorage implements StorageBackend {
  private db: Database;

  /**
   * @param dbPath - Path to the SQLite database file.
   *                 Defaults to ~/.umcp/memory.db
   */
  constructor(dbPath?: string) {
    const resolvedPath =
      dbPath ?? path.join(process.env.HOME ?? ".", ".umcp", "memory.db");

    // Dynamic require so the JSON backend works without this dep installed
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const BetterSQLite = require("better-sqlite3");
    this.db = new BetterSQLite(resolvedPath) as Database;

    this.initialize();
  }

  // ── Schema Setup ─────────────────────────────────────────

  /**
   * Create the memory_nodes table if it doesn't exist.
   * Relations are stored as a JSON array string.
   * Metadata is stored as a JSON object string.
   */
  private initialize(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memory_nodes (
        id          TEXT PRIMARY KEY,
        type        TEXT NOT NULL,
        content     TEXT NOT NULL,
        metadata    TEXT,
        relations   TEXT,
        created_at  INTEGER NOT NULL,
        updated_at  INTEGER
      );

      CREATE INDEX IF NOT EXISTS idx_type       ON memory_nodes (type);
      CREATE INDEX IF NOT EXISTS idx_created_at ON memory_nodes (created_at DESC);
    `);
  }

  // ── Serialisation Helpers ────────────────────────────────

  /** Convert a DB row → MemoryNode */
  private rowToNode(row: any): MemoryNode {
    return {
      id: row.id,
      type: row.type,
      content: row.content,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      relations: row.relations ? JSON.parse(row.relations) : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at ?? undefined,
    };
  }

  /** Convert a MemoryNode → DB row values */
  private nodeToRow(node: MemoryNode) {
    return {
      id: node.id,
      type: node.type,
      content: node.content,
      metadata: node.metadata ? JSON.stringify(node.metadata) : null,
      relations: node.relations ? JSON.stringify(node.relations) : null,
      created_at: node.createdAt,
      updated_at: node.updatedAt ?? null,
    };
  }

  // ── StorageBackend Interface ──────────────────────────────

  async store(node: MemoryNode): Promise<void> {
    const row = this.nodeToRow(node);
    this.db
      .prepare(
        `INSERT INTO memory_nodes
         (id, type, content, metadata, relations, created_at, updated_at)
         VALUES (@id, @type, @content, @metadata, @relations, @created_at, @updated_at)`
      )
      .run(row);
  }

  async getAll(): Promise<MemoryNode[]> {
    const rows = this.db
      .prepare("SELECT * FROM memory_nodes ORDER BY created_at DESC")
      .all();
    return rows.map(this.rowToNode);
  }

  async getById(id: string): Promise<MemoryNode | null> {
    const row = this.db
      .prepare("SELECT * FROM memory_nodes WHERE id = ?")
      .get(id);
    return row ? this.rowToNode(row) : null;
  }

  async update(
    id: string,
    patch: Partial<MemoryNode>
  ): Promise<MemoryNode | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const updated: MemoryNode = {
      ...existing,
      ...patch,
      id, // never allow id to change
      updatedAt: Date.now(),
    };

    const row = this.nodeToRow(updated);
    this.db
      .prepare(
        `UPDATE memory_nodes SET
         type = @type,
         content = @content,
         metadata = @metadata,
         relations = @relations,
         updated_at = @updated_at
         WHERE id = @id`
      )
      .run(row);

    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const result = this.db
      .prepare("DELETE FROM memory_nodes WHERE id = ?")
      .run(id);
    return result.changes > 0;
  }

  // ── SQLite-specific extras ───────────────────────────────

  /**
   * Filter nodes by type — takes advantage of the SQL index.
   * Not part of the base StorageBackend interface but useful
   * for advanced queries in v2.
   */
  async getByType(type: MemoryNode["type"]): Promise<MemoryNode[]> {
    const rows = this.db
      .prepare(
        "SELECT * FROM memory_nodes WHERE type = ? ORDER BY created_at DESC"
      )
      .all(type);
    return rows.map(this.rowToNode);
  }

  /**
   * Get nodes created within a time range.
   */
  async getByDateRange(from: number, to: number): Promise<MemoryNode[]> {
    const rows = this.db
      .prepare(
        "SELECT * FROM memory_nodes WHERE created_at BETWEEN ? AND ? ORDER BY created_at DESC"
      )
      .all(from, to);
    return rows.map(this.rowToNode);
  }
}
