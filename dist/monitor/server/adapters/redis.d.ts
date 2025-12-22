/**
 * Redis Adapter
 *
 * Uses Redis pub/sub for distributed event handling.
 * Allows multiple monitor instances and remote hook scripts.
 */
import type { IPCAdapter, EventHandler, MonitorEvent, RedisConfig } from '../../../types/monitor';
export interface RedisAdapterOptions {
    config: RedisConfig;
}
export declare class RedisAdapter implements IPCAdapter {
    private subscriber;
    private publisher;
    private handlers;
    private running;
    private config;
    constructor(options: RedisAdapterOptions);
    start(): Promise<void>;
    stop(): Promise<void>;
    onEvent(handler: EventHandler): void;
    offEvent(handler: EventHandler): void;
    isRunning(): boolean;
    private emitEvent;
    /**
     * Publish an event to the Redis channel
     * This is used by hook scripts in Redis mode
     */
    publishEvent(event: MonitorEvent): Promise<void>;
    /**
     * Get the Redis configuration for clients
     */
    getConfig(): RedisConfig;
}
/**
 * Create a standalone publisher for hook scripts
 * This doesn't subscribe, just publishes events
 */
export declare function publishEventToRedis(config: RedisConfig, event: MonitorEvent): Promise<void>;
