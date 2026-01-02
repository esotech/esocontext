/**
 * Claude Wrapper Command
 *
 * Wraps the Claude CLI with a PTY to enable:
 * - Full terminal output streaming to the monitor
 * - Remote input injection from the monitor UI
 * - Session state tracking (processing vs waiting for input)
 *
 * Usage: contextuate claude [claude-args...]
 */
/**
 * Main wrapper function
 */
export declare function claudeCommand(args: string[]): Promise<void>;
