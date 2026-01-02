#!/usr/bin/env node
/**
 * Server CLI Entry Point
 *
 * This is the entry point for running the UI server as a standalone process.
 * Used when starting the server in detached mode.
 */

import * as fs from 'fs';
import { Command } from 'commander';
import { createMonitorServer } from './index.js';
import type { MonitorConfig } from '../../types/monitor.js';
import { getDefaultMonitorPaths } from '../../types/monitor.js';

const PATHS = getDefaultMonitorPaths();

const program = new Command();

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
    let config: MonitorConfig;
    try {
        const configContent = await fs.promises.readFile(options.config, 'utf-8');
        config = JSON.parse(configContent);
    } catch (err: any) {
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
    const server = await createMonitorServer({
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
