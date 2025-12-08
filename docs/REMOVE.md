# Contextuate Remove Command

The `contextuate remove` command safely cleans up the Contextuate framework files from your project.

## Usage

```bash
contextuate remove
```

## How It Works

This command is designed to be **safe**. It checks the hash of each installed file against the original template.

*   **Unmodified Files**: If a file (like a jump file in `.cursor/rules/`) has NOT been changed since installation, it is deleted.
*   **Modified Files**: If you have edited a file, `remove` will **SKIP** it to prevent data loss. You will see a `[SKIP]` message in the console.

## what gets removed?

It primarily targets "Jump Files"—the platform-specific configuration files that point to `docs/ai`.

*   `CLAUDE.md`
*   `AGENTS.md`
*   `GEMINI.md`
*   `.clinerules/cline-memory-bank.md`
*   `.cursor/rules/project.mdc`
*   `.windsurf/rules/project.md`
*   `.antigravity/rules.md`
*   `.github/copilot-instructions.md`

It also cleans up empty directories left behind by these files.
