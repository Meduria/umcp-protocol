// ============================================================
// UMCP — Storage Backend v1: JSON File
// ============================================================
//
// The simplest possible storage backend.
// All memory nodes are persisted as a single JSON file on disk.
//
// ✅ Pros:
//   - Zero dependencies
//   - Fully local-first (no database required)
//   - Human-readable — you can open the file and read your memory
//   - Easy to backup, share, or version-control
//
// ⚠️ Cons:
//   - Loads entire file into memory on each read
//   - Not suitable for very large memory stores (>10k nodes)
//   - No concurrent write safety
//
// Best for: personal use, small projects, CLI tools, prototypes.
// ------------------------------------------------------------

import fs from "fs/promises";
import path from "path";
import type { MemoryNode, StorageBackend } from "./types.js";

export class JsonFileStorage implements StorageBackend {
  private filePath: string;

  /**
   * @param filePath - Path to the JSON file used for storage.
   *                   Defaults to ~/.umcp/memory.json
   */
  constructor(filePath?: string) {
    this.filePath =
      filePath ??
      path.join(process.env.HOME ?? ".", ".umcp", "memory.json");
  }

  // ── Private Helpers ──────────────────────────────────────

  /** Read all nodes from disk. Returns [] if file doesn't exist yet. */
  private async readFile(): Promise<MemoryNode[]> {
    try {
      const raw = await fs.readFile(this.filePath, "utf-8");
      return JSON.parse(raw) as MemoryNode[];
    } catch (err: any) {
      if (err.code === "ENOENT") return []; // First run — file doesn't exist yet
      throw err;
    }
  }

  /** Write all nodes to disk, creating directories if needed. */
  private async writeFile(nodes: MemoryNode[]): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(nodes, null, 2), "utf-8");
  }

  // ── StorageBackend Interface ──────────────────────────────

  async store(node: MemoryNode): Promise<void> {
    const nodes = await this.readFile();
    nodes.push(node);
    await this.writeFile(nodes);
  }

  async getAll(): Promise<MemoryNode[]> {
    return this.readFile();
  }

  async getById(id: string): Promise<MemoryNode | null> {
    const nodes = await this.readFile();
    return nodes.find((n) => n.id === id) ?? null;
  }

  async update(
    id: string,
    patch: Partial<MemoryNode>
  ): Promise<MemoryNode | null> {
    const nodes = await this.readFile();
    const index = nodes.findIndex((n) => n.id === id);
    if (index === -1) return null;

    nodes[index] = { ...nodes[index], ...patch, updatedAt: Date.now() };
    await this.writeFile(nodes);
    return nodes[index];
  }

  async delete(id: string): Promise<boolean> {
    const nodes = await this.readFile();
    const filtered = nodes.filter((n) => n.id !== id);
    if (filtered.length === nodes.length) return false;
    await this.writeFile(filtered);
    return true;
  }
}
