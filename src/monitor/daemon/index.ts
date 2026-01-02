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

import * as fs from 'fs';
import * as net from 'net';
import { MonitorConfig, getDefaultMonitorPaths } from '../../types/monitor.js';
import { StateManager } from './state.js';
import { FileWatcher } from './watcher.js';
import { EventProcessor } from './processor.js';
import { Notifier } from './notifier.js';

const PATHS = getDefaultMonitorPaths();

// Wrapper session info
interface WrapperSession {
  wrapperId: string;
  socket: net.Socket;
  pid: number;
  claudeSessionId: string | null;
  state: 'starting' | 'processing' | 'waiting_input' | 'ended';
  cwd: string;
  startTime: number;
}

export class MonitorDaemon {
  private config: MonitorConfig;
  private state: StateManager;
  private watcher: FileWatcher;
  private processor: EventProcessor;
  private notifier: Notifier;
  private socketServer: net.Server | null = null;
  private uiClients: Set<net.Socket> = new Set();
  private wrapperSessions: Map<string, WrapperSession> = new Map();
  private running = false;

  constructor(config: MonitorConfig) {
    this.config = config;
    this.state = new StateManager();
    this.notifier = new Notifier(config, (data) => this.broadcastToClients(data));
    this.processor = new EventProcessor(this.state, this.notifier);
    this.watcher = new FileWatcher();
  }

  /**
   * Broadcast data to all connected UI clients
   */
  private broadcastToClients(data: any): void {
    const message = JSON.stringify(data) + '\n';
    for (const client of this.uiClients) {
      try {
        client.write(message);
      } catch (err) {
        // Client disconnected, will be cleaned up
      }
    }
  }

  /**
   * Start the daemon
   */
  async start(): Promise<void> {
    console.log('[Daemon] Starting monitor daemon...');

    // Load state from disk
    await this.state.load();

    // Load existing sessions
    await this.processor.loadSessions();

    // Set up file watcher
    this.watcher.setLastProcessedTimestamp(this.state.lastProcessedTimestamp);
    this.watcher.setHandler((event, filepath) => this.processor.processEvent(event, filepath));
    await this.watcher.start();

    // Start periodic state saving (every 30 seconds)
    this.state.startPeriodicSave(30000);

    // Start socket server for UI connections
    await this.startSocketServer();

    this.running = true;
    console.log('[Daemon] Monitor daemon started');
  }

  /**
   * Stop the daemon
   */
  async stop(): Promise<void> {
    console.log('[Daemon] Stopping monitor daemon...');

    this.running = false;

    // Stop file watcher
    await this.watcher.stop();

    // Stop periodic save and save final state
    this.state.stopPeriodicSave();
    await this.state.save();

    // Close socket server
    if (this.socketServer) {
      // Forcefully disconnect all UI clients
      for (const client of this.uiClients) {
        try {
          client.write(JSON.stringify({ type: 'error', message: 'Daemon shutting down' }) + '\n');
          client.destroy(); // Force close the connection
        } catch (err) {
          // Ignore errors during shutdown
        }
      }

      await new Promise<void>((resolve) => {
        // Add timeout to force resolve if close takes too long
        const timeout = setTimeout(() => {
          console.log('[Daemon] Socket server close timeout, forcing shutdown');
          this.socketServer = null;
          this.uiClients.clear();
          // Clean up socket file
          try {
            fs.unlinkSync('/tmp/contextuate-daemon.sock');
          } catch (err) {
            // Ignore if already removed
          }
          resolve();
        }, 3000);

        this.socketServer!.close(() => {
          clearTimeout(timeout);
          this.socketServer = null;
          this.uiClients.clear();
          console.log('[Daemon] Socket server stopped');
          // Clean up socket file
          try {
            fs.unlinkSync('/tmp/contextuate-daemon.sock');
          } catch (err) {
            // Ignore if already removed
          }
          resolve();
        });
      });
    }

    console.log('[Daemon] Monitor daemon stopped');
  }

  /**
   * Check if daemon is running
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Start Unix socket server for hook notifications and UI clients
   */
  private async startSocketServer(): Promise<void> {
    const socketPath = '/tmp/contextuate-daemon.sock';

    // Remove existing socket file
    try {
      await fs.promises.unlink(socketPath);
    } catch (err) {
      // Ignore if doesn't exist
    }

    this.socketServer = net.createServer((socket) => {
      // Track this as a UI client for broadcasting
      this.uiClients.add(socket);
      console.log(`[Daemon] Client connected (${this.uiClients.size} total)`);

      // Handle incoming data (from hooks, wrappers, or UI commands)
      let buffer = '';
      let isWrapper = false;
      let wrapperId: string | null = null;

      socket.on('data', (data) => {
        buffer += data.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (line.trim()) {
            try {
              const message = JSON.parse(line);

              // Handle wrapper registration
              if (message.type === 'wrapper_register') {
                isWrapper = true;
                wrapperId = message.wrapperId;
                this.handleWrapperRegister(socket, message);
                continue;
              }

              // Handle wrapper messages
              if (message.type === 'wrapper_started') {
                this.handleWrapperStarted(message);
                continue;
              }

              if (message.type === 'wrapper_ended') {
                this.handleWrapperEnded(message);
                continue;
              }

              if (message.type === 'state_changed') {
                this.handleWrapperStateChange(message);
                continue;
              }

              if (message.type === 'output') {
                this.handleWrapperOutput(message);
                continue;
              }

              // Handle input injection request from UI
              if (message.type === 'inject_input') {
                this.handleInputInjection(message);
                continue;
              }

              // Process hook events immediately for instant updates
              if (message.id && message.eventType) {
                // This is an event from a hook - process it instantly
                this.processor.processEvent(message, null).catch(err => {
                  console.error('[Daemon] Error processing socket event:', err);
                });

                // Check if this event indicates waiting for input
                // and notify relevant wrapper
                this.checkAndNotifyWrapperState(message);
              }
            } catch (err) {
              // Ignore parse errors
            }
          }
        }
      });

      socket.on('close', () => {
        this.uiClients.delete(socket);

        // Clean up wrapper session if this was a wrapper
        if (isWrapper && wrapperId) {
          this.wrapperSessions.delete(wrapperId);
          console.log(`[Daemon] Wrapper ${wrapperId} disconnected (${this.wrapperSessions.size} wrappers remaining)`);
        } else {
          console.log(`[Daemon] Client disconnected (${this.uiClients.size} remaining)`);
        }
      });

      socket.on('error', () => {
        this.uiClients.delete(socket);
        if (isWrapper && wrapperId) {
          this.wrapperSessions.delete(wrapperId);
        }
      });
    });

    this.socketServer.listen(socketPath, () => {
      console.log(`[Daemon] Socket server listening on ${socketPath}`);
    });
  }

  /**
   * Handle wrapper registration
   */
  private handleWrapperRegister(socket: net.Socket, message: any): void {
    const session: WrapperSession = {
      wrapperId: message.wrapperId,
      socket,
      pid: message.pid,
      claudeSessionId: null,
      state: 'starting',
      cwd: '',
      startTime: Date.now(),
    };

    this.wrapperSessions.set(message.wrapperId, session);
    console.log(`[Daemon] Wrapper registered: ${message.wrapperId} (PID: ${message.pid})`);

    // Acknowledge registration
    socket.write(JSON.stringify({ type: 'registered', wrapperId: message.wrapperId }) + '\n');

    // Notify UI clients about new wrapper
    this.broadcastToClients({
      type: 'wrapper_connected',
      wrapperId: message.wrapperId,
      state: 'starting',
    });
  }

  /**
   * Handle wrapper started notification
   */
  private handleWrapperStarted(message: any): void {
    const session = this.wrapperSessions.get(message.wrapperId);
    if (session) {
      session.cwd = message.cwd || '';
      console.log(`[Daemon] Wrapper ${message.wrapperId} started Claude in ${session.cwd}`);
    }
  }

  /**
   * Handle wrapper ended notification
   */
  private handleWrapperEnded(message: any): void {
    const session = this.wrapperSessions.get(message.wrapperId);
    if (session) {
      session.state = 'ended';
      console.log(`[Daemon] Wrapper ${message.wrapperId} ended (exit: ${message.exitCode})`);

      // Notify UI clients
      this.broadcastToClients({
        type: 'wrapper_disconnected',
        wrapperId: message.wrapperId,
        exitCode: message.exitCode,
      });
    }
  }

  /**
   * Handle wrapper state change
   */
  private handleWrapperStateChange(message: any): void {
    const session = this.wrapperSessions.get(message.wrapperId);
    if (session) {
      session.state = message.state;
      console.log(`[Daemon] Wrapper ${message.wrapperId} state: ${message.state}`);

      // Notify UI clients about state change
      this.broadcastToClients({
        type: 'wrapper_state',
        wrapperId: message.wrapperId,
        state: message.state,
      });
    }
  }

  /**
   * Handle wrapper output (for session log)
   */
  private handleWrapperOutput(message: any): void {
    // Forward output to UI clients for session log view
    this.broadcastToClients({
      type: 'wrapper_output',
      wrapperId: message.wrapperId,
      data: message.data,
      timestamp: message.timestamp,
    });
  }

  /**
   * Handle input injection request from UI
   */
  private handleInputInjection(message: any): void {
    const { wrapperId, input } = message;

    // Find wrapper by ID
    const session = this.wrapperSessions.get(wrapperId);
    if (!session) {
      console.error(`[Daemon] No wrapper found with ID: ${wrapperId}`);
      return;
    }

    // Check if wrapper is waiting for input
    if (session.state !== 'waiting_input') {
      console.error(`[Daemon] Wrapper ${wrapperId} not waiting for input (state: ${session.state})`);
      return;
    }

    // Send input to wrapper
    console.log(`[Daemon] Injecting input to wrapper ${wrapperId}: ${input.slice(0, 50)}...`);
    session.socket.write(JSON.stringify({
      type: 'inject_input',
      input,
    }) + '\n');

    // Update state
    session.state = 'processing';

    // Notify UI
    this.broadcastToClients({
      type: 'wrapper_state',
      wrapperId,
      state: 'processing',
    });
  }

  /**
   * Check if a hook event indicates waiting for input
   * and notify relevant wrapper
   */
  private checkAndNotifyWrapperState(event: any): void {
    // Stop events typically indicate Claude is waiting for input
    if (event.hookType === 'Stop' || event.hookType === 'Notification') {
      // Try to find a wrapper session for this Claude session
      for (const [wrapperId, session] of this.wrapperSessions) {
        // Match by Claude session ID if we have it
        if (session.claudeSessionId === event.sessionId) {
          session.state = 'waiting_input';
          session.socket.write(JSON.stringify({
            type: 'state_update',
            state: 'waiting_input',
          }) + '\n');

          this.broadcastToClients({
            type: 'wrapper_state',
            wrapperId,
            state: 'waiting_input',
          });
          return;
        }

        // Try to match by working directory
        if (!session.claudeSessionId && event.workingDirectory === session.cwd) {
          // Associate this Claude session with the wrapper
          session.claudeSessionId = event.sessionId;
          session.state = 'waiting_input';
          console.log(`[Daemon] Associated wrapper ${wrapperId} with Claude session ${event.sessionId}`);

          session.socket.write(JSON.stringify({
            type: 'state_update',
            state: 'waiting_input',
          }) + '\n');

          this.broadcastToClients({
            type: 'wrapper_state',
            wrapperId,
            state: 'waiting_input',
            claudeSessionId: event.sessionId,
          });
          return;
        }
      }
    }
  }

  /**
   * Get list of active wrapper sessions (for UI)
   */
  getWrapperSessions(): Array<{ wrapperId: string; state: string; claudeSessionId: string | null }> {
    return Array.from(this.wrapperSessions.values()).map(s => ({
      wrapperId: s.wrapperId,
      state: s.state,
      claudeSessionId: s.claudeSessionId,
    }));
  }
}

/**
 * Start the daemon (exported for CLI)
 */
export async function startDaemon(config: MonitorConfig): Promise<MonitorDaemon> {
  const daemon = new MonitorDaemon(config);
  await daemon.start();
  return daemon;
}
