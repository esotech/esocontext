/**
 * Redis Adapter
 *
 * Uses Redis pub/sub for distributed event handling.
 * Allows multiple monitor instances and remote hook scripts.
 */

import type { IPCAdapter, EventHandler, MonitorEvent, RedisConfig } from '../../../types/monitor';

// Dynamic import for ioredis to make it optional
let Redis: typeof import('ioredis').default;

export interface RedisAdapterOptions {
  config: RedisConfig;
}

export class RedisAdapter implements IPCAdapter {
  private subscriber: InstanceType<typeof Redis> | null = null;
  private publisher: InstanceType<typeof Redis> | null = null;
  private handlers: Set<EventHandler> = new Set();
  private running = false;
  private config: RedisConfig;

  constructor(options: RedisAdapterOptions) {
    this.config = options.config;
  }

  async start(): Promise<void> {
    if (this.running) {
      return;
    }

    // Dynamically import ioredis
    try {
      const ioredis = await import('ioredis');
      Redis = ioredis.default;
    } catch (err) {
      throw new Error('Redis adapter requires ioredis package. Install with: npm install ioredis');
    }

    const redisOptions = {
      host: this.config.host,
      port: this.config.port,
      password: this.config.password || undefined,
      retryStrategy: (times: number) => {
        if (times > 10) {
          return null; // Stop retrying
        }
        return Math.min(times * 100, 3000);
      },
    };

    // Create subscriber connection
    this.subscriber = new Redis(redisOptions);
    this.publisher = new Redis(redisOptions);

    // Wait for connections
    await Promise.all([
      new Promise<void>((resolve, reject) => {
        this.subscriber!.on('connect', resolve);
        this.subscriber!.on('error', reject);
      }),
      new Promise<void>((resolve, reject) => {
        this.publisher!.on('connect', resolve);
        this.publisher!.on('error', reject);
      }),
    ]);

    // Subscribe to the channel
    await this.subscriber.subscribe(this.config.channel);

    // Handle incoming messages
    this.subscriber.on('message', (channel, message) => {
      if (channel === this.config.channel) {
        try {
          const event: MonitorEvent = JSON.parse(message);
          this.emitEvent(event);
        } catch (err) {
          console.error('[Redis] Failed to parse event:', err);
        }
      }
    });

    this.running = true;
    console.log(`[Redis] Connected to ${this.config.host}:${this.config.port}, channel: ${this.config.channel}`);
  }

  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    if (this.subscriber) {
      await this.subscriber.unsubscribe(this.config.channel);
      this.subscriber.disconnect();
      this.subscriber = null;
    }

    if (this.publisher) {
      this.publisher.disconnect();
      this.publisher = null;
    }

    this.running = false;
    console.log('[Redis] Disconnected');
  }

  onEvent(handler: EventHandler): void {
    this.handlers.add(handler);
  }

  offEvent(handler: EventHandler): void {
    this.handlers.delete(handler);
  }

  isRunning(): boolean {
    return this.running;
  }

  private emitEvent(event: MonitorEvent): void {
    for (const handler of this.handlers) {
      try {
        const result = handler(event);
        if (result instanceof Promise) {
          result.catch((err) => {
            console.error('[Redis] Event handler error:', err);
          });
        }
      } catch (err) {
        console.error('[Redis] Event handler error:', err);
      }
    }
  }

  /**
   * Publish an event to the Redis channel
   * This is used by hook scripts in Redis mode
   */
  async publishEvent(event: MonitorEvent): Promise<void> {
    if (!this.publisher) {
      throw new Error('Redis adapter not started');
    }
    await this.publisher.publish(this.config.channel, JSON.stringify(event));
  }

  /**
   * Get the Redis configuration for clients
   */
  getConfig(): RedisConfig {
    return this.config;
  }
}

/**
 * Create a standalone publisher for hook scripts
 * This doesn't subscribe, just publishes events
 */
export async function publishEventToRedis(config: RedisConfig, event: MonitorEvent): Promise<void> {
  let RedisClient: typeof Redis;

  try {
    const ioredis = await import('ioredis');
    RedisClient = ioredis.default;
  } catch (err) {
    throw new Error('Redis requires ioredis package');
  }

  const client = new RedisClient({
    host: config.host,
    port: config.port,
    password: config.password || undefined,
  });

  try {
    await client.publish(config.channel, JSON.stringify(event));
  } finally {
    client.disconnect();
  }
}
