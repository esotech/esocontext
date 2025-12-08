# Contextuate Init Command

The `contextuate init` command is the entry point for the Contextuate framework. It bootstraps your project with the necessary structure, configuration files, and platform-specific optimizations.

## Usage

```bash
contextuate init [options]
```

### Options

*   `-f, --force`: Overwrite existing files without asking. Use with caution.

## What It Does

1.  **Platform Selection**: Interactively asks which platforms (e.g., Cursor, Claude, GitHub Copilot) you are using.
2.  **Directory Structure**: Creates the standard `docs/ai` hierarchy:
    *   `docs/ai/agents`: Usage definitions for AI agents.
    *   `docs/ai/standards`: Coding standards and best practices.
    *   `docs/ai/context.md`: The main context file for LLMs.
    *   `docs/ai/project-structure.md`: (Optional) Auto-generated map of your codebase.
3.  **Jump File Generation**: Creates optimization files for your selected platforms (e.g., `.cursor/rules/project.mdc` or `.clinerules`). These "jump files" point the AI tools to your `docs/ai` folder.
4.  **Template Installation**: Copies default templates to get you started immediately.
5.  **Git Integration**: Updates `.gitignore` to ensure generated files (or library files) are handled correctly.

## Interactive Flow

When you run `init`, you will see a wizard:

1.  **Project Marker Check**: Verifies you are in a project root.
2.  **Platform Choice**: You can select "All", search by name (e.g., "gemini"), or select from a checklist.
3.  **Installation**: The CLI then performs the setup and confirms each step.

## Post-Install Steps

After running `init`:
1.  Edit `docs/ai/context.md` to describe your project.
2.  Run `contextuate index` to generate a file tree.
3.  Start using your AI editor—it should now automatically detect the context!
