/**
 * Claude Wrapper Command
 *
 * Spawns a Claude session managed by the daemon.
 * The daemon handles PTY management, so the session persists
 * even after this command exits.
 *
 * Usage: contextuate claude [claude-args...]
 */
/**
 * Main command entry point
 */
export declare function claudeCommand(args: string[]): Promise<void>;
/**
 * List active wrappers
 */
export declare function listWrappersCommand(): Promise<void>;
/**
 * Kill a wrapper session
 */
export declare function killWrapperCommand(wrapperId: string): Promise<void>;
