# Project Context

> **Purpose:** Master index for AI assistants working with this project. This is the primary entry point for all AI context.

---

## Quick Start

**Project Name:** {YOUR_PROJECT_NAME}

**Description:** {Brief description of what this project does}

**Tech Stack:**
- {Language/Framework 1}
- {Language/Framework 2}
- {Database/Services}

---

## Documentation Index

### Architecture
| Document | Purpose |
|----------|---------|
| [Architecture Overview](architecture.md) | System design and components |
| {Add more as needed} | |

### Code Documentation
| Document | Purpose |
|----------|---------|
| {Add class/service docs} | |

### Standards
| Document | Purpose |
|----------|---------|
| [Coding Standards](.context/standards/coding-standards.md) | Code style and conventions |
| [Behavioral Guidelines](.context/standards/behavioral-guidelines.md) | AI behavior rules |

### AI-Specific
| Document | Purpose |
|----------|---------|
| [Base Agent](.context/agents/base.agent.md) | Foundation for all agents |
| [Agent Creator](.context/agents/agent-creator.agent.md) | How to create new agents |
| [Task Workflow](.context/standards/task-workflow.md) | Multi-session task structure |

---

## Project-Specific Standards

### Coding Conventions

```{language}
// Add your project-specific coding standards here
// These override the defaults in .context/standards/coding-standards.md
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| {type} | {convention} | {example} |

### File Structure

```
{project}/
├── src/                    # Source code
├── tests/                  # Test files
├── docs/                   # Documentation
│   └── ai/                 # AI-specific
│       ├── context.md      # THIS FILE - main AI context
│       ├── .context/       # Framework (don't modify)
│       ├── agents/         # Custom agents
│       ├── quickrefs/      # Quick references
│       └── tasks/          # Task tracking (gitignored)
└── ...
```

---

## Common Patterns

### {Pattern Category}

```{language}
// Example pattern
```

---

## Key Concepts

### {Concept 1}
{Explanation of important concept}

### {Concept 2}
{Explanation of important concept}

---

## Getting Started

### For AI Assistants

1. Read this file completely
2. Check `docs/ai/agents/` for specialized agents
3. Review `docs/ai/quickrefs/` for condensed references
4. Follow task workflow for multi-session work

### For Humans

1. Main documentation is in `docs/`
2. AI context lives in `docs/ai/`
3. Don't modify `docs/ai/.context/` (framework files)
4. Create custom agents in `docs/ai/agents/`

---

## Environment

### Development Setup
{Instructions for setting up development environment}

### Required Tools
- {Tool 1}
- {Tool 2}

---

## Contact / Resources

- Repository: {URL}
- Documentation: {URL}
- Issues: {URL}
