// ============================================================
// UMCP — Core Client
// The main interface for any AI tool to interact with memory.
// ============================================================

import { randomUUID } from "crypto";
import type {
  MemoryNode,
  StoreInput,
  QueryInput,
  QueryResult,
  StorageBackend,
  ScoringWeights,
} from "./types.js";
import { DEFAULT_WEIGHTS } from "./types.js";
import { rankNodes } from "./scoring.js";

export interface UMCPClientOptions {
  /** The storage backend to use (JSON file or SQLite) */
  storage: StorageBackend;

  /** Override default scoring weights */
  weights?: Partial<ScoringWeights>;
}

/**
 * UMCPClient — The main entry point for any tool using UMCP.
 *
 * Usage:
 *   const client = new UMCPClient({ storage: new JsonFileStorage() });
 *   await client.store({ type: "decision", content: "Using PostgreSQL" });
 *   const ctx = await client.query({ task: "build auth system" });
 */
export class UMCPClient {
  private storage: StorageBackend;
  private weights: ScoringWeights;

  constructor(options: UMCPClientOptions) {
    this.storage = options.storage;
    this.weights = { ...DEFAULT_WEIGHTS, ...options.weights };
  }

  // ── STORE ─────────────────────────────────────────────────

  /**
   * Store a new memory node.
   * Auto-generates id and createdAt.
   *
   * @returns The stored MemoryNode with its generated id.
   */
  async store(input: StoreInput): Promise<MemoryNode> {
    const node: MemoryNode = {
      ...input,
      id: randomUUID(),
      createdAt: Date.now(),
    };

    await this.storage.store(node);
    return node;
  }

  // ── QUERY ─────────────────────────────────────────────────

  /**
   * Retrieve the most relevant memory nodes for a given task.
   *
   * Scoring: Score(n) = α·S + β·R + γ·G
   *   S = keyword similarity
   *   R = recency
   *   G = graph proximity
   */
  async query(input: QueryInput): Promise<QueryResult> {
    const limit = input.limit ?? 5;
    let nodes = await this.storage.getAll();

    // Optional type filter
    if (input.type) {
      nodes = nodes.filter((n) => n.type === input.type);
    }

    const ranked = rankNodes(nodes, input.task, this.weights, limit);

    return {
      nodes: ranked.map((r) => r.node),
      scores: ranked.map((r) => r.score),
    };
  }

  // ── UPDATE ────────────────────────────────────────────────

  /**
   * Update an existing memory node by id.
   * Only the fields you provide will be changed.
   *
   * @returns The updated node, or null if not found.
   */
  async update(
    id: string,
    patch: Partial<Omit<MemoryNode, "id" | "createdAt">>
  ): Promise<MemoryNode | null> {
    return this.storage.update(id, patch);
  }

  // ── DELETE ────────────────────────────────────────────────

  /**
   * Delete a memory node by id.
   *
   * @returns true if deleted, false if not found.
   */
  async delete(id: string): Promise<boolean> {
    return this.storage.delete(id);
  }

  // ── UTILS ─────────────────────────────────────────────────

  /**
   * Get all stored nodes (no scoring, no filtering).
   * Useful for debugging or displaying a memory browser.
   */
  async getAll(): Promise<MemoryNode[]> {
    return this.storage.getAll();
  }

  /**
   * Get a single node by id.
   */
  async getById(id: string): Promise<MemoryNode | null> {
    return this.storage.getById(id);
  }
}
