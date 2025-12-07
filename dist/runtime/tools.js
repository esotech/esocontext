"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolLoader = void 0;
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
class ToolLoader {
    constructor(projectRoot) {
        this.toolsDir = path_1.default.join(projectRoot, 'docs/ai/.contextuate/tools');
    }
    async loadTools(capabilities) {
        const loadedTools = [];
        // 1. Check if tools dir exists
        if (!await fs_extra_1.default.pathExists(this.toolsDir)) {
            console.warn(`[WARN] Tools directory not found at: ${this.toolsDir}`);
            return [];
        }
        // 2. Map capabilities to files
        // Convention: capability "spawn_agent" -> "spawn.tool.md" or "spawn_agent.tool.md"
        // We'll search for matches.
        const files = await fs_extra_1.default.readdir(this.toolsDir);
        for (const cap of capabilities) {
            // rigorous matching: 
            // 1. Exact match: cap + ".tool.md"
            // 2. Name match: file starts with cap + "."
            // 3. Simple fuzzy?
            const match = files.find(f => f === `${cap}.tool.md` ||
                f === `${cap.replace(/_/g, '-')}.tool.md` ||
                f.startsWith(`${cap}.`));
            if (match) {
                const toolPath = path_1.default.join(this.toolsDir, match);
                const content = await fs_extra_1.default.readFile(toolPath, 'utf-8');
                loadedTools.push({
                    name: cap,
                    path: toolPath,
                    content: content
                });
            }
            else {
                console.warn(`[WARN] No tool definition found for capability: ${cap}`);
            }
        }
        return loadedTools;
    }
}
exports.ToolLoader = ToolLoader;
