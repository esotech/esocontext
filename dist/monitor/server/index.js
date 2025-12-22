"use strict";
/**
 * Monitor Server
 *
 * Main entry point for the monitor server.
 * Orchestrates all components: broker, HTTP server, WebSocket server, persistence.
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
exports.MonitorWebSocketServer = exports.createFastifyServer = exports.RedisAdapter = exports.UnixSocketAdapter = exports.EventBroker = void 0;
exports.createMonitorServer = createMonitorServer;
exports.getDefaultConfig = getDefaultConfig;
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const broker_1 = require("./broker");
const fastify_1 = require("./fastify");
const websocket_1 = require("./websocket");
const file_store_1 = require("../persistence/file-store");
/**
 * Create and configure the monitor server
 */
async function createMonitorServer(options) {
    const { config } = options;
    const dataDir = options.dataDir || path.join(os.homedir(), '.contextuate');
    // Initialize persistence
    const persistence = new file_store_1.FileStore({
        baseDir: dataDir,
    });
    await persistence.init();
    // Initialize broker
    const broker = new broker_1.EventBroker(config);
    broker.setPersistence(persistence);
    // Initialize HTTP server
    const http = await (0, fastify_1.createFastifyServer)({
        host: config.server.host,
        port: config.server.port,
        broker,
        persistence,
    });
    // Initialize WebSocket server
    const ws = new websocket_1.MonitorWebSocketServer({
        host: config.server.host,
        port: config.server.wsPort,
        broker,
        persistence,
    });
    const server = {
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
            }
            else {
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
function getDefaultConfig() {
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
var broker_2 = require("./broker");
Object.defineProperty(exports, "EventBroker", { enumerable: true, get: function () { return broker_2.EventBroker; } });
var unix_socket_1 = require("./adapters/unix-socket");
Object.defineProperty(exports, "UnixSocketAdapter", { enumerable: true, get: function () { return unix_socket_1.UnixSocketAdapter; } });
var redis_1 = require("./adapters/redis");
Object.defineProperty(exports, "RedisAdapter", { enumerable: true, get: function () { return redis_1.RedisAdapter; } });
var fastify_2 = require("./fastify");
Object.defineProperty(exports, "createFastifyServer", { enumerable: true, get: function () { return fastify_2.createFastifyServer; } });
var websocket_2 = require("./websocket");
Object.defineProperty(exports, "MonitorWebSocketServer", { enumerable: true, get: function () { return websocket_2.MonitorWebSocketServer; } });
