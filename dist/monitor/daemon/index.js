"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MonitorDaemon = void 0;
exports.startDaemon = startDaemon;
const fs = __importStar(require("fs"));
const net = __importStar(require("net"));
const monitor_js_1 = require("../../types/monitor.js");
const state_js_1 = require("./state.js");
const watcher_js_1 = require("./watcher.js");
const processor_js_1 = require("./processor.js");
const notifier_js_1 = require("./notifier.js");
const PATHS = (0, monitor_js_1.getDefaultMonitorPaths)();
class MonitorDaemon {
    constructor(config) {
        this.socketServer = null;
        this.uiClients = new Set();
        this.wrapperSessions = new Map();
        this.running = false;
        this.config = config;
        this.state = new state_js_1.StateManager();
        this.notifier = new notifier_js_1.Notifier(config, (data) => this.broadcastToClients(data));
        this.processor = new processor_js_1.EventProcessor(this.state, this.notifier);
        this.watcher = new watcher_js_1.FileWatcher();
    }
    /**
     * Broadcast data to all connected UI clients
     */
    broadcastToClients(data) {
        const message = JSON.stringify(data) + '\n';
        for (const client of this.uiClients) {
            try {
                client.write(message);
            }
            catch (err) {
                // Client disconnected, will be cleaned up
            }
        }
    }
    /**
     * Start the daemon
     */
    async start() {
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
    async stop() {
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
                }
                catch (err) {
                    // Ignore errors during shutdown
                }
            }
            await new Promise((resolve) => {
                // Add timeout to force resolve if close takes too long
                const timeout = setTimeout(() => {
                    console.log('[Daemon] Socket server close timeout, forcing shutdown');
                    this.socketServer = null;
                    this.uiClients.clear();
                    // Clean up socket file
                    try {
                        fs.unlinkSync('/tmp/contextuate-daemon.sock');
                    }
                    catch (err) {
                        // Ignore if already removed
                    }
                    resolve();
                }, 3000);
                this.socketServer.close(() => {
                    clearTimeout(timeout);
                    this.socketServer = null;
                    this.uiClients.clear();
                    console.log('[Daemon] Socket server stopped');
                    // Clean up socket file
                    try {
                        fs.unlinkSync('/tmp/contextuate-daemon.sock');
                    }
                    catch (err) {
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
    isRunning() {
        return this.running;
    }
    /**
     * Start Unix socket server for hook notifications and UI clients
     */
    async startSocketServer() {
        const socketPath = '/tmp/contextuate-daemon.sock';
        // Remove existing socket file
        try {
            await fs.promises.unlink(socketPath);
        }
        catch (err) {
            // Ignore if doesn't exist
        }
        this.socketServer = net.createServer((socket) => {
            // Track this as a UI client for broadcasting
            this.uiClients.add(socket);
            console.log(`[Daemon] Client connected (${this.uiClients.size} total)`);
            // Handle incoming data (from hooks, wrappers, or UI commands)
            let buffer = '';
            let isWrapper = false;
            let wrapperId = null;
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
                        }
                        catch (err) {
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
                }
                else {
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
    handleWrapperRegister(socket, message) {
        const session = {
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
    handleWrapperStarted(message) {
        const session = this.wrapperSessions.get(message.wrapperId);
        if (session) {
            session.cwd = message.cwd || '';
            console.log(`[Daemon] Wrapper ${message.wrapperId} started Claude in ${session.cwd}`);
        }
    }
    /**
     * Handle wrapper ended notification
     */
    handleWrapperEnded(message) {
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
    handleWrapperStateChange(message) {
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
    handleWrapperOutput(message) {
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
    handleInputInjection(message) {
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
    checkAndNotifyWrapperState(event) {
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
    getWrapperSessions() {
        return Array.from(this.wrapperSessions.values()).map(s => ({
            wrapperId: s.wrapperId,
            state: s.state,
            claudeSessionId: s.claudeSessionId,
        }));
    }
}
exports.MonitorDaemon = MonitorDaemon;
/**
 * Start the daemon (exported for CLI)
 */
async function startDaemon(config) {
    const daemon = new MonitorDaemon(config);
    await daemon.start();
    return daemon;
}
