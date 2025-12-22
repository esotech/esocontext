/**
 * WebSocket Server
 *
 * Provides real-time event streaming to connected UI clients.
 * Uses the 'ws' library for WebSocket handling.
 */
import type { EventBroker } from './broker';
import type { PersistenceStore } from '../../types/monitor';
export interface WebSocketServerOptions {
    port: number;
    host?: string;
    broker: EventBroker;
    persistence?: PersistenceStore;
}
export declare class MonitorWebSocketServer {
    private wss;
    private clients;
    private broker;
    private persistence?;
    private port;
    private host;
    private unsubscribeBroker?;
    constructor(options: WebSocketServerOptions);
    /**
     * Start the WebSocket server
     */
    start(): Promise<void>;
    /**
     * Stop the WebSocket server
     */
    stop(): Promise<void>;
    /**
     * Handle new WebSocket connection
     */
    private handleConnection;
    /**
     * Handle message from client
     */
    private handleClientMessage;
    /**
     * Send historical events to a client
     */
    private sendHistoricalEvents;
    /**
     * Send all recent events across all sessions to a client
     */
    private sendAllRecentEvents;
    /**
     * Handle events from the broker
     */
    private handleBrokerEvent;
    /**
     * Broadcast an event to subscribed clients
     */
    private broadcastEvent;
    /**
     * Broadcast a session update to all clients
     */
    private broadcastSessionUpdate;
    /**
     * Broadcast updated session list to all clients (for bulk operations)
     */
    private broadcastSessionsUpdate;
    /**
     * Check if a client is subscribed to events for a session
     */
    private isClientSubscribed;
    /**
     * Get the number of connected clients
     */
    getClientCount(): number;
}
