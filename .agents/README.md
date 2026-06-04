# Agent Workspace (`.agents/`)

This directory is the local execution workspace for AI agents. It houses operational configurations, running session states, execution logs, and short-term memory schemas to enable safe and context-preserving autonomous operations on the KBFE codebase.

## Directory Structure

```text
.agents/
├── README.md               # This file
├── agent-config.json       # Agent environment & execution preferences
├── memory.md               # Compact durable memory for agent navigation
├── QUESTION_LOG_TEMPLATE.md # Standard log shape for each user question
├── harness/                # Declarative development harness for IDE agents
├── logs/                   # (Ignored) Session execution logs & audit trails
└── memory/                 # (Ignored) Shared entity index or short-term memory
```

## files

### `agent-config.json`

Specifies the active AI execution environment, model preferences, workspace constraints, and the path to active skill files. Keep paths absolute or relative to the repository root.

Example configuration:
```json
{
  "project": "KBFE Logistics Control Tower",
  "agent": {
    "activeModel": "Gemini 3.5 Flash",
    "temperature": 0.2,
    "maxTokens": 8192
  },
  "workspace": {
    "skillsPath": "docs/skills",
    "contextPath": "docs/context",
    "tempDir": ".agents/scratch"
  },
  "safety": {
    "dryRunByDefault": true,
    "interactiveConfirmationRequired": true,
    "authorizedWriteScope": [
      "frontend/",
      "backend/",
      "docs/",
      ".agents/"
    ]
  }
}
```

### `logs/`

Used by execution loops or agent runner tools to persist transaction traces, CLI command outputs, migration audits, and one log file per user question.

Recommended path format:

```text
.agents/logs/YYYY-MM-DD/HHMMSS-short-topic.md
```

Use `.agents/QUESTION_LOG_TEMPLATE.md` for the entry shape. Do not log secrets, tokens, raw `.env` values, private credentials, or production connection strings. Keep this directory listed in `.gitignore` to prevent committing massive ephemeral run logs to the repository.

### `memory.md`

Compact durable memory for agent navigation. It stores stable project decisions, user preferences, scope boundaries, and recurring shortcuts so agents do not need to reread old logs by default.

Rules:

- Read `memory.md` before old logs.
- Read old logs only when a task depends on previous decisions or audit details.
- Keep memory around 500-1,000 tokens.
- When memory grows too large, rewrite it shorter and leave detailed history in `logs/`.
- Never store secrets, tokens, raw `.env` values, API keys, connection strings, or private credentials.

### `harness/`

Declarative development harness for IDE agents. It defines agent roles, workflows, context packs, and prompt templates for building the repository. This is distinct from the product/runtime harness target under `backend/ai/harness`.

### `memory/`

Used for stateful RAG indexes or local entity caches. A typical use case is saving the last inspected `DO-xxxx` or `PR-xxxx` IDs to support prompt-less context recovery across successive agent turns.

## Operational Rules

1. **Do Not Commit Ephemeral Files**: Only `README.md` and `agent-config.json` (as a template) should be tracked by Git. All run logs, caches, and scratch files must remain untracked.
2. **Read Config First**: Before executing complex architectural changes, agents should read `agent-config.json` to verify active safety rules and scope constraints.
3. **Read Memory Before Logs**: Agents should read `.agents/memory.md` for durable context, then read old logs only when relevant.
4. **Write Scope Guard**: Agents must respect the `"authorizedWriteScope"` array in `agent-config.json` and avoid editing unlisted directories.
5. **Log Each Question**: When filesystem access is available, agents should create one `.agents/logs/` entry per user question using the configured template and redact sensitive values.
