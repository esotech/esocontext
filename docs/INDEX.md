# Contextuate Index Command

The `contextuate index` command generates a high-level map of your project structure. This helps LLMs understand the layout of your codebase without reading every single file.

## Usage

```bash
contextuate index [options]
```

### Options

*   `-d, --depth <number>`: The maximum depth to traverse. Default is `5`.
*   `-f, --force`: Overwrite existing index.

## Output

The command creates `docs/ai/project-structure.md`. This file contains a tree representation of your project:

```
src/
├── commands/
│   ├── index.ts
│   └── run.ts
├── utils/
│   └── tokens.ts
└── index.ts
package.json
```

## Benefits

*   **Token Efficiency**: Providing a file tree is much cheaper than listing all file paths or contents.
*   **Navigation**: Agents can see where files are located to decide which ones to read.
*   **Context**: The `contextuate run` command automatically injects this file into the agent's context.
