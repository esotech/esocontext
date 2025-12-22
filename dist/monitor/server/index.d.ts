/**
 * Monitor Server
 *
 * Main entry point for the monitor server.
 * Orchestrates all components: broker, HTTP server, WebSocket server, persistence.
 */
import type { FastifyInstance } from 'fastify';
import type { MonitorConfig } from '../../types/monitor';
import { EventBroker } from './broker';
import { MonitorWebSocketServer } from './websocket';
import { FileStore } from '../persistence/file-store';
export interface MonitorServer {
    broker: EventBroker;
    http: FastifyInstance;
    ws: MonitorWebSocketServer;
    persistence: FileStore;
    start: () => Promise<void>;
    stop: () => Promise<void>;
}
export interface CreateServerOptions {
    config: MonitorConfig;
    dataDir?: string;
}
/**
 * Create and configure the monitor server
 */
export declare function createMonitorServer(options: CreateServerOptions): Promise<MonitorServer>;
/**
 * Default configuration
 */
export declare function getDefaultConfig(): MonitorConfig;
export { EventBroker } from './broker';
export { UnixSocketAdapter } from './adapters/unix-socket';
export { RedisAdapter } from './adapters/redis';
export { createFastifyServer } from './fastify';
export { MonitorWebSocketServer } from './websocket';
