// ============================================================
// UMCP — Scoring Engine
// Hybrid retrieval: keyword similarity + recency + graph proximity
// ============================================================

import type { MemoryNode, ScoringWeights, DEFAULT_WEIGHTS } from "./types.js";

/**
 * Tokenize a string into lowercase words.
 */
function tokenize(text: string): Set<string> {
  return new Set(text.toLowerCase().match(/\w+/g) ?? []);
}

/**
 * S — Keyword similarity between query and node content.
 * Uses Jaccard similarity on word tokens.
 *
 * Jaccard(A, B) = |A ∩ B| / |A ∪ B|
 *
 * Range: 0.0 (no overlap) → 1.0 (identical)
 */
function keywordSimilarity(query: string, content: string): number {
  const qTokens = tokenize(query);
  const cTokens = tokenize(content);

  if (qTokens.size === 0 || cTokens.size === 0) return 0;

  const intersection = new Set([...qTokens].filter((t) => cTokens.has(t)));
  const union = new Set([...qTokens, ...cTokens]);

  return intersection.size / union.size;
}

/**
 * R — Recency score.
 * Exponential decay: newer nodes score closer to 1.0.
 * Half-life is set to 7 days by default.
 *
 * R(t) = e^(-λ·Δt)   where Δt is age in days
 */
function recencyScore(createdAt: number, halfLifeDays = 7): number {
  const ageMs = Date.now() - createdAt;
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  const lambda = Math.LN2 / halfLifeDays;
  return Math.exp(-lambda * ageDays);
}

/**
 * G — Graph proximity score.
 * A node scores higher if it is directly related to other
 * high-scoring nodes (first-degree graph neighbours).
 *
 * Simple version: +1 point per relation that appears in the
 * candidate set, normalised to [0, 1].
 */
function graphProximityScore(
  node: MemoryNode,
  candidateIds: Set<string>
): number {
  if (!node.relations || node.relations.length === 0) return 0;
  const hits = node.relations.filter((id) => candidateIds.has(id)).length;
  return Math.min(hits / node.relations.length, 1);
}

/**
 * Score a single node against a query.
 *
 * Score(n) = α·S + β·R + γ·G
 */
export function scoreNode(
  node: MemoryNode,
  query: string,
  candidateIds: Set<string>,
  weights: ScoringWeights
): number {
  const S = keywordSimilarity(query, node.content);
  const R = recencyScore(node.createdAt);
  const G = graphProximityScore(node, candidateIds);

  return weights.alpha * S + weights.beta * R + weights.gamma * G;
}

/**
 * Rank a list of nodes by relevance to a query.
 * Returns nodes sorted descending by score.
 */
export function rankNodes(
  nodes: MemoryNode[],
  query: string,
  weights: ScoringWeights,
  limit: number
): { node: MemoryNode; score: number }[] {
  const candidateIds = new Set(nodes.map((n) => n.id));

  return nodes
    .map((node) => ({
      node,
      score: scoreNode(node, query, candidateIds, weights),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
