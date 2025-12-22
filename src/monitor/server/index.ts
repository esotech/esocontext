/**
 * Monitor Server
 *
 * Main entry point for the monitor server.
 * Orchestrates all components: broker, HTTP server, WebSocket server, persistence.
 */

import * as path from 'path';
import * as os from 'os';
import type { FastifyInstance } from 'fastify';
import type { MonitorConfig } from '../../types/monitor';
import { EventBroker } from './broker';
import { createFastifyServer } from './fastify';
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
export async function createMonitorServer(options: CreateServerOptions): Promise<MonitorServer> {
  const { config } = options;
  const dataDir = options.dataDir || path.join(os.homedir(), '.contextuate');

  // Initialize persistence
  const persistence = new FileStore({
    baseDir: dataDir,
  });
  await persistence.init();

  // Initialize broker
  const broker = new EventBroker(config);
  broker.setPersistence(persistence);

  // Initialize HTTP server
  const http = await createFastifyServer({
    host: config.server.host,
    port: config.server.port,
    broker,
    persistence,
  });

  // Initialize WebSocket server
  const ws = new MonitorWebSocketServer({
    host: config.server.host,
    port: config.server.wsPort,
    broker,
    persistence,
  });

  const server: MonitorServer = {
    broker,
    http,
    ws,
    persistence,

    async start() {
      // Load existing sessions
      await broker.loadSessions();

      // Start the broker (IPC adapter)
      await broker.start();

      // Start WebSocket server
      await ws.start();

      console.log('');
      console.log('='.repeat(50));
      console.log('  Contextuate Monitor Server');
      console.log('='.repeat(50));
      console.log(`  Mode:        ${config.mode}`);
      console.log(`  HTTP:        http://${config.server.host}:${config.server.port}`);
      console.log(`  WebSocket:   ws://${config.server.host}:${config.server.wsPort}`);
      console.log(`  Data:        ${dataDir}`);
      if (config.mode === 'local') {
        console.log(`  Socket:      ${config.socketPath}`);
      } else {
        console.log(`  Redis:       ${config.redis.host}:${config.redis.port}`);
      }
      console.log('='.repeat(50));
      console.log('');
    },

    async stop() {
      console.log('[Server] Shutting down...');
      await ws.stop();
      await broker.stop();
      await http.close();
      await persistence.close();
      console.log('[Server] Stopped');
    },
  };

  return server;
}

/**
 * Default configuration
 */
export function getDefaultConfig(): MonitorConfig {
  return {
    mode: 'local',
    server: {
      host: '0.0.0.0',
      port: 3847,
      wsPort: 3848,
    },
    redis: {
      host: 'localhost',
      port: 6379,
      password: null,
      channel: 'contextuate:events',
    },
    persistence: {
      enabled: true,
      type: 'file',
    },
    socketPath: '/tmp/contextuate-monitor.sock',
  };
}

// Export components
export { EventBroker } from './broker';
export { UnixSocketAdapter } from './adapters/unix-socket';
export { RedisAdapter } from './adapters/redis';
export { createFastifyServer } from './fastify';
export { MonitorWebSocketServer } from './websocket';
