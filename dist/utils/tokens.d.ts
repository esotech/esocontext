/**
 * Estimates the number of tokens in a string.
 * Uses a simple heuristic: ~4 characters per token for English text/code.
 */
export declare function estimateTokens(text: string): number;
/**
 * Generates a compact file tree representation of a directory.
 * Respects .gitignore via a simple filter (can be enhanced).
 */
export declare function generateFileTree(dir: string, maxDepth?: number): Promise<string>;
