// ============================================================
// UMCP — Unified Memory Context Protocol
// Core Type Definitions
// ============================================================

/**
 * The type of a memory node.
 * Each type represents a different kind of context that can be stored.
 *
 * - project    : Information about a project (name, stack, goals)
 * - decision   : A decision that was made (e.g. "switched to PostgreSQL")
 * - event      : Something that happened (e.g. "deployed to production")
 * - preference : User or system preferences (e.g. "prefers TypeScript")
 * - artifact   : A piece of work (e.g. a file, a schema, a design)
 */
export type MemoryNodeType =
  | "project"
  | "decision"
  | "event"
  | "preference"
  | "artifact";

/**
 * A MemoryNode is the atomic unit of stored context in UMCP.
 * Every piece of memory is a node in the context graph.
 */
export interface MemoryNode {
  /** Unique identifier for this node */
  id: string;

  /** Classification of what kind of memory this is */
  type: MemoryNodeType;

  /** The actual content — human-readable or structured text */
  content: string;

  /** Optional auxiliary data (tags, source tool, version, etc.) */
  metadata?: Record<string, unknown>;

  /**
   * Graph edges — IDs of other nodes this node relates to.
   * Example: a "decision" node may relate to a "project" node.
   */
  relations?: string[];

  /** Unix timestamp (ms) of when this node was created */
  createdAt: number;

  /** Unix timestamp (ms) of last modification */
  updatedAt?: number;
}

/**
 * Input when storing a new memory node.
 * id and createdAt are auto-generated.
 */
export type StoreInput = Omit<MemoryNode, "id" | "createdAt" | "updatedAt">;

/**
 * Input when querying relevant context.
 */
export interface QueryInput {
  /** The current task or question */
  task: string;

  /** Optional: filter by node type */
  type?: MemoryNodeType;

  /** Max number of results to return (default: 5) */
  limit?: number;
}

/**
 * Result of a context query.
 */
export interface QueryResult {
  nodes: MemoryNode[];
  /** Score assigned to each node (same order as nodes) */
  scores: number[];
}

/**
 * Scoring weights for the hybrid retrieval algorithm.
 * Score(n) = α·S + β·R + γ·G
 *
 * S = keyword/semantic similarity
 * R = recency (newer = higher score)
 * G = graph proximity (related nodes score higher)
 */
export interface ScoringWeights {
  /** Weight for semantic/keyword similarity (α) */
  alpha: number;
  /** Weight for recency decay (β) */
  beta: number;
  /** Weight for graph proximity (γ) */
  gamma: number;
}

export const DEFAULT_WEIGHTS: ScoringWeights = {
  alpha: 0.6,
  beta: 0.3,
  gamma: 0.1,
};

/**
 * The interface every UMCP storage backend must implement.
 * This allows swapping between JSON, SQLite, in-memory, etc.
 */
export interface StorageBackend {
  store(node: MemoryNode): Promise<void>;
  getAll(): Promise<MemoryNode[]>;
  getById(id: string): Promise<MemoryNode | null>;
  update(id: string, patch: Partial<MemoryNode>): Promise<MemoryNode | null>;
  delete(id: string): Promise<boolean>;
}
