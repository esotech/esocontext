/**
 * Unix Socket Adapter
 *
 * Listens for events from hook scripts via a Unix domain socket.
 * This is the default local mode for single-machine setups.
 */
import type { IPCAdapter, EventHandler, MonitorEvent } from '../../../types/monitor';
export interface UnixSocketAdapterOptions {
    socketPath: string;
}
export declare class UnixSocketAdapter implements IPCAdapter {
    private server;
    private handlers;
    private running;
    private socketPath;
    constructor(options: UnixSocketAdapterOptions);
    start(): Promise<void>;
    stop(): Promise<void>;
    private cleanup;
    onEvent(handler: EventHandler): void;
    offEvent(handler: EventHandler): void;
    isRunning(): boolean;
    private emitEvent;
    /**
     * Get the socket path for client connections
     */
    getSocketPath(): string;
}
/**
 * Create a client to send events to the Unix socket
 * This is used by the hook script
 */
export declare function sendEventToSocket(socketPath: string, event: MonitorEvent): Promise<void>;
