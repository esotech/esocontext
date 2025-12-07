import fs from 'fs-extra';
import path from 'path';
import matter from 'gray-matter';

export interface ToolDefinition {
    name: string;
    content: string; // The full markdown content to inject into context
    path: string;
}

export class ToolLoader {
    private toolsDir: string;

    constructor(projectRoot: string) {
        this.toolsDir = path.join(projectRoot, 'docs/ai/.contextuate/tools');
    }

    async loadTools(capabilities: string[]): Promise<ToolDefinition[]> {
        const loadedTools: ToolDefinition[] = [];

        // 1. Check if tools dir exists
        if (!await fs.pathExists(this.toolsDir)) {
            console.warn(`[WARN] Tools directory not found at: ${this.toolsDir}`);
            return [];
        }

        // 2. Map capabilities to files
        // Convention: capability "spawn_agent" -> "spawn.tool.md" or "spawn_agent.tool.md"
        // We'll search for matches.

        const files = await fs.readdir(this.toolsDir);

        for (const cap of capabilities) {
            // rigorous matching: 
            // 1. Exact match: cap + ".tool.md"
            // 2. Name match: file starts with cap + "."
            // 3. Simple fuzzy?

            const match = files.find(f =>
                f === `${cap}.tool.md` ||
                f === `${cap.replace(/_/g, '-')}.tool.md` ||
                f.startsWith(`${cap}.`)
            );

            if (match) {
                const toolPath = path.join(this.toolsDir, match);
                const content = await fs.readFile(toolPath, 'utf-8');

                loadedTools.push({
                    name: cap,
                    path: toolPath,
                    content: content
                });
            } else {
                console.warn(`[WARN] No tool definition found for capability: ${cap}`);
            }
        }

        return loadedTools;
    }
}
