/**
 * Unix Socket Adapter
 *
 * Listens for events from hook scripts via a Unix domain socket.
 * This is the default local mode for single-machine setups.
 */

import * as net from 'net';
import * as fs from 'fs';
import * as path from 'path';
import type { IPCAdapter, EventHandler, MonitorEvent } from '../../../types/monitor';

export interface UnixSocketAdapterOptions {
  socketPath: string;
}

export class UnixSocketAdapter implements IPCAdapter {
  private server: net.Server | null = null;
  private handlers: Set<EventHandler> = new Set();
  private running = false;
  private socketPath: string;

  constructor(options: UnixSocketAdapterOptions) {
    this.socketPath = options.socketPath;
  }

  async start(): Promise<void> {
    if (this.running) {
      return;
    }

    // Clean up existing socket file if it exists
    await this.cleanup();

    // Ensure directory exists
    const socketDir = path.dirname(this.socketPath);
    if (!fs.existsSync(socketDir)) {
      fs.mkdirSync(socketDir, { recursive: true });
    }

    return new Promise((resolve, reject) => {
      this.server = net.createServer((socket) => {
        let buffer = '';

        socket.on('data', (data) => {
          buffer += data.toString();

          // Process complete JSON messages (newline-delimited)
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.trim()) {
              try {
                const event: MonitorEvent = JSON.parse(line);
                this.emitEvent(event);
              } catch (err) {
                console.error('[UnixSocket] Failed to parse event:', err);
              }
            }
          }
        });

        socket.on('error', (err) => {
          console.error('[UnixSocket] Socket error:', err);
        });
      });

      this.server.on('error', (err) => {
        console.error('[UnixSocket] Server error:', err);
        reject(err);
      });

      this.server.listen(this.socketPath, () => {
        this.running = true;
        // Set permissions so any user can write to the socket
        fs.chmodSync(this.socketPath, 0o777);
        console.log(`[UnixSocket] Listening on ${this.socketPath}`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.running = false;
          this.cleanup().then(resolve);
        });
      } else {
        resolve();
      }
    });
  }

  private async cleanup(): Promise<void> {
    try {
      if (fs.existsSync(this.socketPath)) {
        fs.unlinkSync(this.socketPath);
      }
    } catch (err) {
      // Ignore cleanup errors
    }
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
            console.error('[UnixSocket] Event handler error:', err);
          });
        }
      } catch (err) {
        console.error('[UnixSocket] Event handler error:', err);
      }
    }
  }

  /**
   * Get the socket path for client connections
   */
  getSocketPath(): string {
    return this.socketPath;
  }
}

/**
 * Create a client to send events to the Unix socket
 * This is used by the hook script
 */
export function sendEventToSocket(socketPath: string, event: MonitorEvent): Promise<void> {
  return new Promise((resolve, reject) => {
    const client = net.createConnection(socketPath, () => {
      const data = JSON.stringify(event) + '\n';
      client.write(data, () => {
        client.end();
        resolve();
      });
    });

    client.on('error', (err) => {
      reject(err);
    });

    // Timeout after 5 seconds
    client.setTimeout(5000, () => {
      client.destroy();
      reject(new Error('Connection timeout'));
    });
  });
}
