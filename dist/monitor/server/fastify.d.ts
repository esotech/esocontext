/**
 * Fastify HTTP Server
 *
 * Serves the Vue UI and provides REST API endpoints
 * for the monitor dashboard.
 */
import { FastifyInstance } from 'fastify';
import type { EventBroker } from './broker';
import type { PersistenceStore } from '../../types/monitor';
export interface FastifyServerOptions {
    host: string;
    port: number;
    broker: EventBroker;
    persistence?: PersistenceStore;
}
export declare function createFastifyServer(options: FastifyServerOptions): Promise<FastifyInstance>;
