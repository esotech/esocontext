# Project Context

> **Purpose:** Master index for AI assistants working with this project. This is the primary entry point for all AI context.

---

## Quick Start

**Project Name:** Esocontext Framework

**Description:** The source repository for the Esocontext framework, a standardized system for providing context to AI coding assistants.

**Tech Stack:**
- **Languages:** Bash (scripts), Markdown (documentation/templates), JSON (metadata).
- **Core Components:** `docs/ai/.context/` directory structure.
- **Distribution:** `install.sh` and `update.sh` scripts.

---

## Documentation Index

### Framework Source
| Document | Purpose |
|----------|---------|
| [Framework README](docs/ai/.context/README.md) | Internal framework documentation |
| [Install Script](docs/ai/.context/bin/install.sh) | The main installation logic |
| [Update Script](docs/ai/.context/bin/update.sh) | The update logic |

### Standards
| Document | Purpose |
|----------|---------|
| [Coding Standards](docs/ai/.context/standards/coding-standards.md) | General coding standards |
| [Behavioral Guidelines](docs/ai/.context/standards/behavioral-guidelines.md) | AI behavior rules |

### AI-Specific
| Document | Purpose |
|----------|---------|
| [Base Agent](docs/ai/.context/agents/base.agent.md) | Foundation for all agents |
| [Agent Creator](docs/ai/.context/tools/agent-creator.tool.md) | How to create new agents |

---

## Project-Specific Standards

### Coding Conventions

```bash
# Bash Scripting Standards
# - Use `set -e` for error handling
# - Use snake_case for variables and functions
# - Quote variables to prevent word splitting
# - Use `[[ ... ]]` for tests
```

### File Structure

```
esocontext/
├── LICENSE
├── README.md               # Root documentation
└── docs/
    └── ai/
        ├── context.md      # THIS FILE
        └── .context/       # The Framework Source (distributed to users)
            ├── agents/     # Base agents
            ├── bin/        # Install scripts
            ├── standards/  # Default standards
            ├── templates/  # Project templates
            └── tools/      # AI tool guides
```

---

## Key Concepts

### The `.context` Directory
The `docs/ai/.context/` directory is the "product". It is what gets installed into user projects. Changes here affect all users of the framework.

### Templates
Templates in `docs/ai/.context/templates/` are used to bootstrap new projects.
- `context.md`: The starting point for user context.
- `platforms/`: Jump files for different AI tools (Cursor, Claude, etc.).

---

## Getting Started

### For AI Assistants

1. This repo **IS** the framework.
2. Changes to `docs/ai/.context/` must be careful as they are distributed to users.
3. Verify `install.sh` logic when changing file structures.

### For Humans

1. Run tests (if available) before committing.
2. Ensure documentation in `.context/README.md` matches the implementation.

---

## Resources

- **Repository:** https://github.com/esotech/esocontext
- **Website:** https://esocontext.dev
