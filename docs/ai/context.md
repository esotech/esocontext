# Project Context

> **Purpose:** User-defined project context for AI assistants. This file contains project-specific identity, tech stack, and custom configurations.
> **Directive:** This file is linked from the framework entry point (`docs/ai/.contextuate/contextuate.md`). Edit this file freely to customize your project context.

---

## File Ownership

| Path | Owner | Editable? |
|------|-------|-----------|
| `docs/ai/.contextuate/` | Framework (Contextuate) | No - overwritten on updates |
| `docs/ai/context.md` | User (You) | Yes - customize freely |
| `docs/ai/agents/` | User | Yes - your custom agents |
| `docs/ai/standards/` | User | Yes - your custom standards |
| `docs/ai/quickrefs/` | User | Yes - your generated quickrefs |
| `docs/ai/tasks/` | User | Yes - your multi-session tasks |

The `.contextuate/` folder contains immutable framework definitions that bootstrap AI context loading. The framework entry point (`contextuate.md`) links to this file for project-specific details.

---

## 1. Project Identity

**Project Name:** Contextuate

**Package:** `@esotech/contextuate`

**Version:** 2.0.0

**Author:** Alexander David Conroy ([@geilt](https://github.com/geilt))

**Description:** Standardized AI Context for Software Projects. Contextuate provides a structured "brain" for your project that AI coding assistants (Claude, Copilot, Cursor, Windsurf, etc.) can understand. It standardizes how AI agents receive context, follow coding standards, and execute tasks.

**Tech Stack:**
- **Languages:** TypeScript, JavaScript, Markdown
- **Runtime:** Node.js (CommonJS)
- **CLI Framework:** Commander.js
- **Web Server:** Fastify (for monitor UI)
- **UI Framework:** Vue.js (monitor dashboard)
- **Build Tool:** TypeScript Compiler (tsc), Vite (monitor UI)
- **Infrastructure:**
  - WebSockets (ws) - real-time communication
  - Redis (ioredis) - optional caching/pub-sub
  - PostgreSQL - optional persistence

---

## 2. Key Concepts

### Framework Bootstrap Pattern
The entry point for AI context is `docs/ai/.contextuate/contextuate.md`. This file bootstraps the entire framework and links to all resources. AI assistants should read this file first, then selectively load only the context they need for their current task.

### Agent System
Agents are specialized AI personas with defined capabilities, rules, and context requirements. They are stored in `docs/ai/agents/` and can be executed via `contextuate run <agent-name>`. Agents inherit from a base definition and can have custom tools, standards, and behavioral guidelines.

### Standards & Conventions
Explicit coding standards are stored in `docs/ai/standards/`. These include language-specific patterns (TypeScript, Python, PHP, Go, Java) and behavioral guidelines that ensure consistent AI output across sessions.

### Quick References (Quickrefs)
Condensed documentation optimized for AI token limits. Generated using the Quickref Generator tool and stored in `docs/ai/quickrefs/`. These provide essential API references without overwhelming context windows.

### Multi-Session Tasks
Complex tasks that span multiple AI sessions use a structured workflow. Task state is persisted in `docs/ai/tasks/<task-name>/` with a project scope file and incremental logs, allowing AI to resume work with full context.

### Platform Integration
Contextuate supports multiple AI platforms through platform-specific configuration files:
- **Claude Code:** `.claude/` symlink
- **Cursor:** `.cursor/rules/`
- **Copilot:** `.github/copilot-instructions.md`
- **Windsurf:** `.windsurfrules`
- **Cline/Antigravity/Gemini:** Similar patterns

---

## 3. Project Structure

```
contextuate/
├── src/                    # TypeScript source code
│   ├── index.ts           # CLI entry point
│   ├── commands/          # CLI command implementations
│   │   ├── init.ts        # Initialize framework in project
│   │   ├── install.ts     # Install templates
│   │   ├── run.ts         # Execute agents
│   │   ├── create.ts      # Create new agents
│   │   ├── index.ts       # Generate file tree index
│   │   ├── context.ts     # Add files to context
│   │   └── remove.ts      # Clean up framework files
│   ├── runtime/           # Agent execution runtime
│   ├── utils/             # Shared utilities
│   ├── types/             # TypeScript type definitions
│   └── monitor/           # Real-time monitoring dashboard
│       └── ui/            # Vue.js frontend
├── dist/                  # Compiled output
├── docs/ai/               # AI context (project-specific)
│   ├── context.md         # This file
│   └── .contextuate/      # Framework files
└── package.json
```

---

## 4. CLI Commands

| Command | Description |
|---------|-------------|
| `contextuate init` | Initialize framework in a project |
| `contextuate install` | Install templates (agents, standards, tools) |
| `contextuate run <agent>` | Execute an agent with optional goal/task |
| `contextuate create-agent` | Create a new agent definition |
| `contextuate index` | Generate project structure file tree |
| `contextuate add-context` | Interactively add files to context |
| `contextuate remove` | Remove framework files |

---

## 5. Resources

- **Repository:** https://github.com/esotech/contextuate
- **Issue Tracker:** https://github.com/esotech/contextuate/issues
- **Documentation:** https://contextuate.md
- **npm Package:** https://www.npmjs.com/package/@esotech/contextuate
- **License:** MIT
