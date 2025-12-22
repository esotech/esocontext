"use strict";
/**
 * Unix Socket Adapter
 *
 * Listens for events from hook scripts via a Unix domain socket.
 * This is the default local mode for single-machine setups.
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
exports.UnixSocketAdapter = void 0;
exports.sendEventToSocket = sendEventToSocket;
const net = __importStar(require("net"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class UnixSocketAdapter {
    constructor(options) {
        this.server = null;
        this.handlers = new Set();
        this.running = false;
        this.socketPath = options.socketPath;
    }
    async start() {
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
                                const event = JSON.parse(line);
                                this.emitEvent(event);
                            }
                            catch (err) {
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
    async stop() {
        if (!this.running) {
            return;
        }
        return new Promise((resolve) => {
            if (this.server) {
                this.server.close(() => {
                    this.running = false;
                    this.cleanup().then(resolve);
                });
            }
            else {
                resolve();
            }
        });
    }
    async cleanup() {
        try {
            if (fs.existsSync(this.socketPath)) {
                fs.unlinkSync(this.socketPath);
            }
        }
        catch (err) {
            // Ignore cleanup errors
        }
    }
    onEvent(handler) {
        this.handlers.add(handler);
    }
    offEvent(handler) {
        this.handlers.delete(handler);
    }
    isRunning() {
        return this.running;
    }
    emitEvent(event) {
        for (const handler of this.handlers) {
            try {
                const result = handler(event);
                if (result instanceof Promise) {
                    result.catch((err) => {
                        console.error('[UnixSocket] Event handler error:', err);
                    });
                }
            }
            catch (err) {
                console.error('[UnixSocket] Event handler error:', err);
            }
        }
    }
    /**
     * Get the socket path for client connections
     */
    getSocketPath() {
        return this.socketPath;
    }
}
exports.UnixSocketAdapter = UnixSocketAdapter;
/**
 * Create a client to send events to the Unix socket
 * This is used by the hook script
 */
function sendEventToSocket(socketPath, event) {
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
