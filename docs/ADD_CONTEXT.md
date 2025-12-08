# Contextuate Add-Context Command

The `contextuate add-context` command allows you to interactively build your `docs/ai/context.md` file by selecting files from your project.

## Usage

```bash
contextuate add-context
```

## Workflow

1.  **Launch**: Run the command.
2.  **Select Action**: Choose to add a file by path.
3.  **Input Path**: Type the relative path (e.g., `src/utils/helpers.ts`).
4.  **Analysis**: The tool calculates the token count of the file.
5.  **Confirmation**:
    *   If small (< 5000 tokens), it adds it immediately.
    *   If large (> 5000 tokens), it asks for confirmation to prevent bloating your context window.
6.  **Update**: The content is appended to `docs/ai/context.md` wrapped in markdown code blocks.

## Purpose

This is useful for quickly assembling a "context pack" for an LLM session without manually copy-pasting file contents.
