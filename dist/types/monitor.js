"use strict";
/**
 * Contextuate Monitor - Type Definitions
 *
 * Shared TypeScript types for the monitor feature.
 * Used by both server and client components.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CONFIG = void 0;
/**
 * Default configuration values
 */
exports.DEFAULT_CONFIG = {
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
