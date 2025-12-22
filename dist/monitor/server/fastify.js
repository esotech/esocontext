"use strict";
/**
 * Fastify HTTP Server
 *
 * Serves the Vue UI and provides REST API endpoints
 * for the monitor dashboard.
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFastifyServer = createFastifyServer;
const fastify_1 = __importDefault(require("fastify"));
const static_1 = __importDefault(require("@fastify/static"));
const cors_1 = __importDefault(require("@fastify/cors"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
async function createFastifyServer(options) {
    const { host, port, broker, persistence } = options;
    const app = (0, fastify_1.default)({
        logger: {
            level: 'warn',
        },
    });
    // Enable CORS for development
    await app.register(cors_1.default, {
        origin: true,
        credentials: true,
    });
    // Serve static UI files
    // When running from dist/, __dirname is dist/monitor/server/
    // UI is at dist/monitor/ui/
    const uiDistPath = path.join(__dirname, '../ui');
    // When running from src/ during dev, UI dist is at src/monitor/ui/dist/
    const uiDevPath = path.join(__dirname, '../ui/dist');
    let staticPath = null;
    // Check for index.html to confirm it's the right directory
    if (fs.existsSync(path.join(uiDistPath, 'index.html'))) {
        staticPath = uiDistPath;
    }
    else if (fs.existsSync(path.join(uiDevPath, 'index.html'))) {
        staticPath = uiDevPath;
    }
    if (!staticPath) {
        console.warn('[HTTP] Warning: UI static files not found. Tried:', uiDistPath, uiDevPath);
    }
    if (staticPath) {
        await app.register(static_1.default, {
            root: staticPath,
            prefix: '/',
        });
    }
    // API Routes
    /**
     * GET /api/status
     * Returns server status and configuration
     */
    app.get('/api/status', async () => {
        const config = broker.getConfig();
        return {
            status: 'running',
            mode: config.mode,
            sessions: broker.getSessions().length,
            activeSessions: broker.getSessions().filter(s => s.status === 'active').length,
            uptime: process.uptime(),
            version: '1.0.0',
        };
    });
    /**
     * GET /api/sessions
     * Returns all sessions
     */
    app.get('/api/sessions', async () => {
        return {
            sessions: broker.getSessions(),
        };
    });
    /**
     * GET /api/sessions/:sessionId
     * Returns a specific session
     */
    app.get('/api/sessions/:sessionId', async (request, reply) => {
        const session = broker.getSession(request.params.sessionId);
        if (!session) {
            reply.code(404);
            return { error: 'Session not found' };
        }
        return { session };
    });
    /**
     * GET /api/sessions/:sessionId/events
     * Returns events for a session
     */
    app.get('/api/sessions/:sessionId/events', async (request, reply) => {
        if (!persistence) {
            reply.code(503);
            return { error: 'Persistence not configured' };
        }
        const { sessionId } = request.params;
        const limit = request.query.limit ? parseInt(request.query.limit) : 100;
        const before = request.query.before ? parseInt(request.query.before) : undefined;
        const after = request.query.after ? parseInt(request.query.after) : undefined;
        try {
            const events = await persistence.getEvents(sessionId, { limit, before, after });
            return { events };
        }
        catch (err) {
            reply.code(500);
            return { error: 'Failed to fetch events' };
        }
    });
    /**
     * GET /api/config
     * Returns current configuration (sanitized)
     */
    app.get('/api/config', async () => {
        const config = broker.getConfig();
        return {
            mode: config.mode,
            server: {
                host: config.server.host,
                port: config.server.port,
                wsPort: config.server.wsPort,
            },
            persistence: {
                enabled: config.persistence.enabled,
                type: config.persistence.type,
            },
        };
    });
    /**
     * Health check endpoint
     */
    app.get('/health', async () => {
        return { status: 'ok' };
    });
    // SPA fallback - serve index.html for all non-API routes
    if (staticPath) {
        app.setNotFoundHandler(async (request, reply) => {
            if (!request.url.startsWith('/api/')) {
                return reply.sendFile('index.html');
            }
            reply.code(404);
            return { error: 'Not found' };
        });
    }
    // Start the server
    await app.listen({ host, port });
    console.log(`[HTTP] Server listening on http://${host}:${port}`);
    return app;
}
