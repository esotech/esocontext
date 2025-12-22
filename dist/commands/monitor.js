"use strict";
/**
 * Monitor Command
 *
 * CLI commands for the Contextuate Monitor feature.
 * - contextuate monitor init: Interactive setup
 * - contextuate monitor [start]: Start the monitor server
 * - contextuate monitor status: Show server status
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
exports.monitorInitCommand = monitorInitCommand;
exports.monitorStartCommand = monitorStartCommand;
exports.monitorStatusCommand = monitorStatusCommand;
const chalk_1 = __importDefault(require("chalk"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const inquirer_1 = __importDefault(require("inquirer"));
const monitor_1 = require("../types/monitor");
// Configuration paths
const CONFIG_DIR = path_1.default.join(os_1.default.homedir(), '.contextuate');
const CONFIG_FILE = path_1.default.join(CONFIG_DIR, 'monitor.config.json');
const HOOKS_DIR = path_1.default.join(CONFIG_DIR, 'hooks');
const CLAUDE_SETTINGS_FILE = path_1.default.join(os_1.default.homedir(), '.claude', 'settings.json');
/**
 * Load monitor configuration
 */
async function loadConfig() {
    try {
        if (await fs_extra_1.default.pathExists(CONFIG_FILE)) {
            const content = await fs_extra_1.default.readFile(CONFIG_FILE, 'utf-8');
            return { ...monitor_1.DEFAULT_CONFIG, ...JSON.parse(content) };
        }
    }
    catch (err) {
        // Ignore errors
    }
    return null;
}
/**
 * Save monitor configuration
 */
async function saveConfig(config) {
    await fs_extra_1.default.ensureDir(CONFIG_DIR);
    await fs_extra_1.default.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
}
/**
 * Initialize monitor command
 */
async function monitorInitCommand() {
    console.log(chalk_1.default.blue(''));
    console.log(chalk_1.default.blue('=========================================='));
    console.log(chalk_1.default.blue('  Contextuate Monitor Setup'));
    console.log(chalk_1.default.blue('=========================================='));
    console.log('');
    try {
        // Check for existing configuration
        const existingConfig = await loadConfig();
        if (existingConfig) {
            const { overwrite } = await inquirer_1.default.prompt([
                {
                    type: 'confirm',
                    name: 'overwrite',
                    message: 'Configuration already exists. Overwrite?',
                    default: false,
                },
            ]);
            if (!overwrite) {
                console.log(chalk_1.default.yellow('[INFO] Setup cancelled.'));
                return;
            }
        }
        // Step 1: Choose mode
        const { mode } = await inquirer_1.default.prompt([
            {
                type: 'list',
                name: 'mode',
                message: 'Select monitor mode:',
                choices: [
                    { name: 'Local (Unix socket) - Single machine', value: 'local' },
                    { name: 'Redis (pub/sub) - Distributed/multi-machine', value: 'redis' },
                ],
                default: 'local',
            },
        ]);
        const config = { ...monitor_1.DEFAULT_CONFIG, mode: mode };
        // Step 2: Redis configuration (if selected)
        if (mode === 'redis') {
            console.log('');
            console.log(chalk_1.default.blue('[INFO] Configure Redis connection:'));
            const redisAnswers = await inquirer_1.default.prompt([
                {
                    type: 'input',
                    name: 'host',
                    message: 'Redis host:',
                    default: 'localhost',
                },
                {
                    type: 'number',
                    name: 'port',
                    message: 'Redis port:',
                    default: 6379,
                },
                {
                    type: 'password',
                    name: 'password',
                    message: 'Redis password (leave empty for none):',
                    default: '',
                },
                {
                    type: 'input',
                    name: 'channel',
                    message: 'Redis channel:',
                    default: 'contextuate:events',
                },
            ]);
            config.redis = {
                host: redisAnswers.host,
                port: redisAnswers.port,
                password: redisAnswers.password || null,
                channel: redisAnswers.channel,
            };
        }
        // Step 3: Server configuration
        console.log('');
        console.log(chalk_1.default.blue('[INFO] Configure server ports:'));
        const serverAnswers = await inquirer_1.default.prompt([
            {
                type: 'input',
                name: 'host',
                message: 'Server host:',
                default: '0.0.0.0',
            },
            {
                type: 'number',
                name: 'port',
                message: 'HTTP port:',
                default: 3847,
            },
            {
                type: 'number',
                name: 'wsPort',
                message: 'WebSocket port:',
                default: 3848,
            },
        ]);
        config.server = {
            host: serverAnswers.host,
            port: serverAnswers.port,
            wsPort: serverAnswers.wsPort,
        };
        // Step 4: Persistence configuration
        console.log('');
        console.log(chalk_1.default.blue('[INFO] Configure data persistence:'));
        const { persistenceType } = await inquirer_1.default.prompt([
            {
                type: 'list',
                name: 'persistenceType',
                message: 'Persistence type:',
                choices: [
                    { name: 'File-based (recommended)', value: 'file' },
                    { name: 'MySQL (coming soon)', value: 'mysql', disabled: true },
                    { name: 'PostgreSQL (coming soon)', value: 'postgresql', disabled: true },
                ],
                default: 'file',
            },
        ]);
        config.persistence = {
            enabled: true,
            type: persistenceType,
        };
        // Step 5: Socket path (local mode only)
        if (mode === 'local') {
            const { socketPath } = await inquirer_1.default.prompt([
                {
                    type: 'input',
                    name: 'socketPath',
                    message: 'Unix socket path:',
                    default: '/tmp/contextuate-monitor.sock',
                },
            ]);
            config.socketPath = socketPath;
        }
        // Save configuration
        await saveConfig(config);
        console.log('');
        console.log(chalk_1.default.green(`[OK] Configuration saved to ${CONFIG_FILE}`));
        // Step 6: Install hook script
        console.log('');
        console.log(chalk_1.default.blue('[INFO] Installing hook script...'));
        await fs_extra_1.default.ensureDir(HOOKS_DIR);
        // Find the hook script source
        let hookSource = path_1.default.join(__dirname, '../monitor/hooks/emit-event.js');
        if (!await fs_extra_1.default.pathExists(hookSource)) {
            hookSource = path_1.default.join(__dirname, '../../src/monitor/hooks/emit-event.js');
        }
        const hookDest = path_1.default.join(HOOKS_DIR, 'emit-event.js');
        if (await fs_extra_1.default.pathExists(hookSource)) {
            await fs_extra_1.default.copy(hookSource, hookDest);
            await fs_extra_1.default.chmod(hookDest, 0o755);
            console.log(chalk_1.default.green(`[OK] Hook script installed to ${hookDest}`));
        }
        else {
            console.log(chalk_1.default.yellow(`[WARN] Hook script source not found. You may need to copy it manually.`));
        }
        // Step 7: Ask about Claude settings integration
        console.log('');
        const { hookLocation } = await inquirer_1.default.prompt([
            {
                type: 'list',
                name: 'hookLocation',
                message: 'Where should hooks be registered?',
                choices: [
                    { name: 'Project level (.claude/settings.json in current directory)', value: 'project' },
                    { name: 'Home level (~/.claude/settings.json - applies to all projects)', value: 'home' },
                    { name: 'Skip - I will configure hooks manually', value: 'skip' },
                ],
                default: 'project',
            },
        ]);
        if (hookLocation !== 'skip') {
            const settingsFile = hookLocation === 'project'
                ? path_1.default.join(process.cwd(), '.claude', 'settings.json')
                : CLAUDE_SETTINGS_FILE;
            await updateClaudeHookSettings(hookDest, settingsFile);
        }
        // Done!
        console.log('');
        console.log(chalk_1.default.green('=========================================='));
        console.log(chalk_1.default.green('  Setup Complete!'));
        console.log(chalk_1.default.green('=========================================='));
        console.log('');
        console.log('Next steps:');
        console.log(`  1. Start the monitor: ${chalk_1.default.cyan('contextuate monitor')}`);
        console.log(`  2. Open your browser to: ${chalk_1.default.cyan(`http://localhost:${config.server.port}`)}`);
        console.log(`  3. Start a Claude Code session - events will appear in the dashboard`);
        console.log('');
    }
    catch (error) {
        if (error.name === 'ExitPromptError' || error.message?.includes('User force closed')) {
            console.log('');
            console.log(chalk_1.default.yellow('Setup cancelled.'));
            return;
        }
        throw error;
    }
}
/**
 * Update Claude settings with hook registrations
 */
async function updateClaudeHookSettings(hookPath, settingsFile) {
    try {
        const claudeDir = path_1.default.dirname(settingsFile);
        await fs_extra_1.default.ensureDir(claudeDir);
        let settings = {};
        if (await fs_extra_1.default.pathExists(settingsFile)) {
            try {
                const content = await fs_extra_1.default.readFile(settingsFile, 'utf-8');
                settings = JSON.parse(content);
            }
            catch {
                // Start fresh if parsing fails
            }
        }
        // Define hooks using new matcher-based format
        // Format: { "matcher": "<pattern>", "hooks": [{"type": "command", "command": "..."}] }
        // Empty string matcher = match all
        const hookEntry = {
            matcher: '',
            hooks: [{ type: 'command', command: hookPath }]
        };
        const hookTypes = ['PreToolUse', 'PostToolUse', 'Notification', 'Stop', 'SubagentStop'];
        // Initialize hooks object if needed
        if (!settings.hooks || typeof settings.hooks !== 'object') {
            settings.hooks = {};
        }
        const hooks = settings.hooks;
        // Add our hook to each hook type
        for (const hookType of hookTypes) {
            if (!Array.isArray(hooks[hookType])) {
                hooks[hookType] = [];
            }
            // Check if our hook is already registered (look inside the hooks array)
            const existing = hooks[hookType].find((entry) => entry.hooks?.some((h) => h.type === 'command' && h.command === hookPath));
            if (!existing) {
                hooks[hookType].push(hookEntry);
            }
        }
        // Save settings
        await fs_extra_1.default.writeFile(settingsFile, JSON.stringify(settings, null, 2));
        console.log(chalk_1.default.green(`[OK] Hooks registered in ${settingsFile}`));
    }
    catch (err) {
        console.log(chalk_1.default.yellow(`[WARN] Could not update Claude settings: ${err}`));
    }
}
/**
 * Start monitor server command
 */
async function monitorStartCommand(options) {
    // Load configuration
    let config = await loadConfig();
    if (!config) {
        console.log(chalk_1.default.yellow('[WARN] No configuration found. Running init...'));
        console.log('');
        await monitorInitCommand();
        config = await loadConfig();
        if (!config) {
            console.log(chalk_1.default.red('[ERROR] Setup failed or cancelled.'));
            return;
        }
    }
    // Apply command-line overrides
    if (options.port) {
        config.server.port = options.port;
    }
    if (options.wsPort) {
        config.server.wsPort = options.wsPort;
    }
    console.log(chalk_1.default.blue('[INFO] Starting Contextuate Monitor...'));
    console.log('');
    try {
        // Dynamically import the server module
        const { createMonitorServer } = await Promise.resolve().then(() => __importStar(require('../monitor/server')));
        const server = await createMonitorServer({ config });
        await server.start();
        // Open browser if not disabled
        if (!options.noOpen) {
            const url = `http://localhost:${config.server.port}`;
            console.log(chalk_1.default.blue(`[INFO] Opening browser: ${url}`));
            // Platform-specific browser open
            const { exec } = await Promise.resolve().then(() => __importStar(require('child_process')));
            const platform = process.platform;
            const command = platform === 'darwin' ? 'open' :
                platform === 'win32' ? 'start' : 'xdg-open';
            exec(`${command} ${url}`, (err) => {
                if (err) {
                    console.log(chalk_1.default.yellow(`[WARN] Could not open browser automatically.`));
                    console.log(chalk_1.default.yellow(`       Please open ${url} manually.`));
                }
            });
        }
        // Handle shutdown signals
        const shutdown = async () => {
            console.log('');
            console.log(chalk_1.default.blue('[INFO] Shutting down...'));
            await server.stop();
            process.exit(0);
        };
        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);
        // Keep running
        console.log(chalk_1.default.green('[OK] Monitor is running. Press Ctrl+C to stop.'));
    }
    catch (err) {
        console.error(chalk_1.default.red(`[ERROR] Failed to start server: ${err.message}`));
        process.exit(1);
    }
}
/**
 * Show monitor status command
 */
async function monitorStatusCommand() {
    const config = await loadConfig();
    console.log(chalk_1.default.blue(''));
    console.log(chalk_1.default.blue('=========================================='));
    console.log(chalk_1.default.blue('  Contextuate Monitor Status'));
    console.log(chalk_1.default.blue('=========================================='));
    console.log('');
    if (!config) {
        console.log(chalk_1.default.yellow('Status: Not configured'));
        console.log('');
        console.log(`Run ${chalk_1.default.cyan('contextuate monitor init')} to set up the monitor.`);
        return;
    }
    // Configuration info
    console.log(chalk_1.default.white('Configuration:'));
    console.log(`  Mode:        ${chalk_1.default.cyan(config.mode)}`);
    console.log(`  HTTP Port:   ${chalk_1.default.cyan(config.server.port)}`);
    console.log(`  WS Port:     ${chalk_1.default.cyan(config.server.wsPort)}`);
    if (config.mode === 'redis') {
        console.log(`  Redis:       ${chalk_1.default.cyan(`${config.redis.host}:${config.redis.port}`)}`);
    }
    else {
        console.log(`  Socket:      ${chalk_1.default.cyan(config.socketPath)}`);
    }
    console.log(`  Persistence: ${chalk_1.default.cyan(config.persistence.type)}`);
    console.log('');
    // Check if server is running
    console.log(chalk_1.default.white('Server Status:'));
    try {
        const response = await fetch(`http://localhost:${config.server.port}/api/status`);
        if (response.ok) {
            const status = await response.json();
            console.log(`  Status:      ${chalk_1.default.green('Running')}`);
            console.log(`  Sessions:    ${chalk_1.default.cyan(status.sessions)} total, ${chalk_1.default.cyan(status.activeSessions)} active`);
            console.log(`  Uptime:      ${chalk_1.default.cyan(formatUptime(status.uptime))}`);
            console.log('');
            console.log(`Dashboard: ${chalk_1.default.cyan(`http://localhost:${config.server.port}`)}`);
        }
        else {
            console.log(`  Status:      ${chalk_1.default.red('Error (HTTP ' + response.status + ')')}`);
        }
    }
    catch (err) {
        console.log(`  Status:      ${chalk_1.default.yellow('Not running')}`);
        console.log('');
        console.log(`Start with: ${chalk_1.default.cyan('contextuate monitor')}`);
    }
    console.log('');
}
/**
 * Format uptime in human-readable form
 */
function formatUptime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const parts = [];
    if (hours > 0)
        parts.push(`${hours}h`);
    if (minutes > 0)
        parts.push(`${minutes}m`);
    parts.push(`${secs}s`);
    return parts.join(' ');
}
