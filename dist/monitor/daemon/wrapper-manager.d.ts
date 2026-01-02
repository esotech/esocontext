/**
 * Wrapper Manager
 *
 * Manages Claude wrapper sessions with PTY.
 * Spawns and manages Claude processes, handles input/output streaming,
 * persists session state, and cleans up on exit.
 */
import * as pty from 'node-pty';
export interface WrapperSession {
    wrapperId: string;
    ptyProcess: pty.IPty;
    pid: number;
    claudeSessionId: string | null;
    state: 'starting' | 'processing' | 'waiting_input' | 'ended';
    cwd: string;
    args: string[];
    startTime: number;
    cols: number;
    rows: number;
}
export interface PersistedWrapper {
    wrapperId: string;
    pid: number;
    claudeSessionId: string | null;
    state: string;
    cwd: string;
    args: string[];
    startTime: number;
    cols: number;
    rows: number;
}
export type WrapperEventCallback = (event: {
    type: 'output' | 'state_changed' | 'started' | 'ended';
    wrapperId: string;
    data?: string;
    state?: string;
    claudeSessionId?: string;
    exitCode?: number;
}) => void;
export declare class WrapperManager {
    private wrappers;
    private persistPath;
    private onEvent;
    constructor(persistPath: string, onEvent: WrapperEventCallback);
    /**
     * Initialize - load persisted wrappers and clean up dead ones
     */
    initialize(): Promise<void>;
    /**
     * Load persisted wrappers and clean up any that are no longer running
     */
    private loadAndCleanup;
    /**
     * Check if a process is still running
     */
    private isProcessRunning;
    /**
     * Spawn a new Claude wrapper session
     */
    spawn(options?: {
        cwd?: string;
        args?: string[];
        cols?: number;
        rows?: number;
    }): Promise<string>;
    /**
     * Write input to a wrapper's PTY
     */
    writeInput(wrapperId: string, input: string): boolean;
    /**
     * Resize a wrapper's PTY
     */
    resize(wrapperId: string, cols: number, rows: number): boolean;
    /**
     * Kill a wrapper session
     */
    kill(wrapperId: string): boolean;
    /**
     * Get all active wrappers
     */
    getAll(): WrapperSession[];
    /**
     * Get a specific wrapper
     */
    get(wrapperId: string): WrapperSession | undefined;
    /**
     * Update wrapper state (e.g., from hook events)
     */
    updateState(wrapperId: string, state: 'starting' | 'processing' | 'waiting_input' | 'ended', claudeSessionId?: string): void;
    /**
     * Shutdown all wrappers
     */
    shutdown(): Promise<void>;
    /**
     * Persist wrapper state to disk
     */
    private persist;
    /**
     * Detect if output indicates Claude is waiting for input
     */
    private detectInputPrompt;
    /**
     * Find the Claude executable
     */
    private findClaudeExecutable;
}
