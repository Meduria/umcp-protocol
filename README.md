# UMCP — Unified Memory Context Protocol

> **A protocol for persistent, structured, cross-model memory sharing in AI systems.**

---

## The Problem

Modern AI systems are **stateless by design**. Every session starts from zero. Every tool forgets what the last tool learned. Every model loses context the moment the conversation ends.

This means:
- You explain the same project structure to every AI tool, every time
- Decisions made in one session are invisible to the next
- Cross-tool workflows (code → docs → tests) share no memory
- There is no standard for AI systems to remember *you*

---

## What is UMCP?

UMCP is an **open protocol proposal** that defines a standardized interface for:

- **Storing** contextual memory as typed, structured nodes
- **Retrieving** relevant context based on semantic similarity, recency, and graph proximity
- **Updating** memory across sessions and tools
- **Sharing** context between heterogeneous AI systems

UMCP is transport-agnostic, model-agnostic, and designed to be **fully local-first**.

---

## Quick Start

```typescript
// Store a memory node
POST /memory
{
  "type": "decision",
  "content": "Switched database from MongoDB to PostgreSQL"
}

// Query context for a task
POST /context
{
  "task": "build authentication system",
  "limit": 5
}

// Response
{
  "context": [
    { "type": "decision", "content": "Database switched to PostgreSQL" }
  ]
}
```

---

## Core Concepts

### Memory Node

The atomic unit of stored context:

```typescript
type MemoryNode = {
  id: string;
  type: "project" | "decision" | "event" | "preference" | "artifact";
  content: string;
  metadata?: Record<string, unknown>;
  relations?: string[];         // Graph edges to other nodes
  createdAt: number;
  updatedAt?: number;
};
```

### Context Graph

Memory nodes form a **directed graph** — nodes can relate to each other, enabling rich contextual retrieval beyond simple keyword search.

### Scoring Algorithm

Context retrieval uses a hybrid scoring model:

```
Score(n) = αS + βR + γG
```

| Variable | Meaning |
|---|---|
| `S` | Semantic similarity to query |
| `R` | Recency decay factor |
| `G` | Graph proximity to related nodes |
| `α β γ` | Tunable weights per deployment |

---

## Protocol Operations

| Operation | Method | Endpoint | Description |
|---|---|---|---|
| STORE | `POST` | `/memory` | Create a new memory node |
| QUERY | `POST` | `/context` | Retrieve relevant context |
| UPDATE | `PATCH` | `/memory/{id}` | Modify an existing node |

---

## Architecture

```
+----------------------+
|     AI Client        |  ← Any AI tool, IDE plugin, CLI
+----------+-----------+
           |
           v
+----------------------+
|    UMCP Client       |  ← SDK / transport layer
+----------+-----------+
           |
           v
+----------------------+
|    UMCP Core         |
|----------------------|
| - Context Engine     |
| - Graph Manager      |
| - Retrieval System   |
+----------+-----------+
           |
           v
+----------------------+
|   Storage Layer      |  ← Local file, SQLite, vector DB
+----------------------+
```

UMCP supports multiple transport modes:
- HTTP REST API
- WebSockets
- Local IPC
- Embedded SDK

---

## Minimal Implementation

```typescript
class MemoryStore {
  private nodes: MemoryNode[] = [];

  store(node: Partial<MemoryNode>): string {
    const id = `node_${Date.now()}`;
    this.nodes.push({ ...node, id, createdAt: Date.now() } as MemoryNode);
    return id;
  }

  query(task: string, limit = 5): MemoryNode[] {
    return this.nodes
      .filter(n => n.content.toLowerCase().includes(task.toLowerCase()))
      .slice(-limit);
  }
}
```

---

## Security & Privacy

- Memory **ownership remains with the user**
- No implicit external sharing required
- Systems **may operate fully locally** with zero network calls
- Access control enforced per user/session
- Explicit memory deletion supported
- Context exposure is **query-scoped only**

---

## Non-Goals

UMCP does **not** define:
- AI model behavior or training
- Prompt engineering standards
- Autonomous agent execution logic
- Tool calling protocols

---

## Roadmap

- [ ] `v0.1` — Core STORE / QUERY / UPDATE operations
- [ ] `v0.2` — Graph-based context traversal
- [ ] `v0.3` — Semantic embedding support
- [ ] `v0.4` — MCP-compatible extension layer
- [ ] `v1.0` — Federated memory graphs & multi-device sync

---

## Comparison with Existing Approaches

| Feature | UMCP | MCP (Anthropic) | LangChain Memory | Raw RAG |
|---|---|---|---|---|
| Cross-model | ✅ | ⚠️ | ❌ | ❌ |
| Typed nodes | ✅ | ❌ | ❌ | ❌ |
| Graph relations | ✅ | ❌ | ❌ | ❌ |
| Local-first | ✅ | ✅ | ⚠️ | ⚠️ |
| Open standard | ✅ | ⚠️ | ❌ | ❌ |
| Transport-agnostic | ✅ | ✅ | ❌ | ❌ |

---

## Contributing

UMCP is an **open proposal**. Contributions and alternative implementations are welcome.

Areas actively seeking input:
- Scoring algorithm tuning
- Storage backend adapters
- Client SDK implementations
- MCP compatibility layer design

---

## Status

This is an early-stage protocol proposal, not an official standard.
Ideas, feedback, and implementations are welcome via Issues and Pull Requests.
