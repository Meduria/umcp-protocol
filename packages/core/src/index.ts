// ============================================================
// UMCP — Public API
// Everything a consumer of this package needs.
// ============================================================

// Core client
export { UMCPClient } from "./client.js";
export type { UMCPClientOptions } from "./client.js";

// Storage backends
export { JsonFileStorage } from "./storage-v1-json.js";
export { SQLiteStorage } from "./storage-v2-sqlite.js";

// Types
export type {
  MemoryNode,
  MemoryNodeType,
  StoreInput,
  QueryInput,
  QueryResult,
  StorageBackend,
  ScoringWeights,
} from "./types.js";

export { DEFAULT_WEIGHTS } from "./types.js";
