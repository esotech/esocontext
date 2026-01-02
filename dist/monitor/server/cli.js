#!/usr/bin/env node
"use strict";
/**
 * Server CLI Entry Point
 *
 * This is the entry point for running the UI server as a standalone process.
 * Used when starting the server in detached mode.
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
const fs = __importStar(require("fs"));
const commander_1 = require("commander");
const index_js_1 = require("./index.js");
const monitor_js_1 = require("../../types/monitor.js");
const PATHS = (0, monitor_js_1.getDefaultMonitorPaths)();
const program = new commander_1.Command();
program
    .name('contextuate-server')
    .description('Contextuate Monitor UI Server')
    .option('-c, --config <path>', 'Path to config file')
    .option('-p, --port <port>', 'HTTP port override', parseInt)
    .option('-w, --ws-port <port>', 'WebSocket port override', parseInt)
    .parse(process.argv);
const options = program.opts();
async function main() {
    if (!options.config) {
        console.error('[Error] Config file path is required (--config)');
        process.exit(1);
    }
    // Load configuration
    let config;
    try {
        const configContent = await fs.promises.readFile(options.config, 'utf-8');
        config = JSON.parse(configContent);
    }
    catch (err) {
        console.error(`[Error] Failed to load config: ${err.message}`);
        process.exit(1);
    }
    // Apply command-line overrides
    if (options.port) {
        config.server.port = options.port;
    }
    if (options.wsPort) {
        config.server.wsPort = options.wsPort;
    }
    // Create and start server
    const server = await (0, index_js_1.createMonitorServer)({
        config,
        dataDir: PATHS.baseDir
    });
    await server.start();
    console.log(`[Server] UI server running on http://localhost:${config.server.port}`);
    // Handle shutdown signals
    const shutdown = async () => {
        console.log('\n[Info] Shutting down server...');
        await server.stop();
        process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}
main().catch((err) => {
    console.error('[Error] Fatal error:', err);
    process.exit(1);
});
