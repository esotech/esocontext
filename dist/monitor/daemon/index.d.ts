/**
 * Monitor Daemon
 *
 * Background daemon process that:
 * - Watches raw/ directory for new events
 * - Processes events (correlates sessions, tracks subagents)
 * - Persists data to sessions/
 * - Notifies UI server via Unix socket/Redis
 *
 * This is Layer 2 of the 3-layer architecture:
 * Layer 1: Hooks (write to raw/)
 * Layer 2: Daemon (process raw/ -> sessions/)
 * Layer 3: UI Server (read from sessions/, serve WebSocket)
 */
import { MonitorConfig } from '../../types/monitor.js';
export declare class MonitorDaemon {
    private config;
    private state;
    private watcher;
    private processor;
    private notifier;
    private socketServer;
    private uiClients;
    private wrapperSessions;
    private running;
    constructor(config: MonitorConfig);
    /**
     * Broadcast data to all connected UI clients
     */
    private broadcastToClients;
    /**
     * Start the daemon
     */
    start(): Promise<void>;
    /**
     * Stop the daemon
     */
    stop(): Promise<void>;
    /**
     * Check if daemon is running
     */
    isRunning(): boolean;
    /**
     * Start Unix socket server for hook notifications and UI clients
     */
    private startSocketServer;
    /**
     * Handle wrapper registration
     */
    private handleWrapperRegister;
    /**
     * Handle wrapper started notification
     */
    private handleWrapperStarted;
    /**
     * Handle wrapper ended notification
     */
    private handleWrapperEnded;
    /**
     * Handle wrapper state change
     */
    private handleWrapperStateChange;
    /**
     * Handle wrapper output (for session log)
     */
    private handleWrapperOutput;
    /**
     * Handle input injection request from UI
     */
    private handleInputInjection;
    /**
     * Check if a hook event indicates waiting for input
     * and notify relevant wrapper
     */
    private checkAndNotifyWrapperState;
    /**
     * Get list of active wrapper sessions (for UI)
     */
    getWrapperSessions(): Array<{
        wrapperId: string;
        state: string;
        claudeSessionId: string | null;
    }>;
}
/**
 * Start the daemon (exported for CLI)
 */
export declare function startDaemon(config: MonitorConfig): Promise<MonitorDaemon>;
