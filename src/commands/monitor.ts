/**
 * Monitor Command
 *
 * CLI commands for the Contextuate Monitor feature.
 * - contextuate monitor init: Interactive setup
 * - contextuate monitor [start]: Start the monitor server
 * - contextuate monitor status: Show server status
 */

import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import inquirer from 'inquirer';
import type { MonitorConfig, MonitorMode, PersistenceType } from '../types/monitor';
import { DEFAULT_CONFIG } from '../types/monitor';

// Configuration paths
const CONFIG_DIR = path.join(os.homedir(), '.contextuate');
const CONFIG_FILE = path.join(CONFIG_DIR, 'monitor.config.json');
const HOOKS_DIR = path.join(CONFIG_DIR, 'hooks');
const CLAUDE_SETTINGS_FILE = path.join(os.homedir(), '.claude', 'settings.json');

/**
 * Load monitor configuration
 */
async function loadConfig(): Promise<MonitorConfig | null> {
    try {
        if (await fs.pathExists(CONFIG_FILE)) {
            const content = await fs.readFile(CONFIG_FILE, 'utf-8');
            return { ...DEFAULT_CONFIG, ...JSON.parse(content) };
        }
    } catch (err) {
        // Ignore errors
    }
    return null;
}

/**
 * Save monitor configuration
 */
async function saveConfig(config: MonitorConfig): Promise<void> {
    await fs.ensureDir(CONFIG_DIR);
    await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
}

/**
 * Initialize monitor command
 */
export async function monitorInitCommand(): Promise<void> {
    console.log(chalk.blue(''));
    console.log(chalk.blue('=========================================='));
    console.log(chalk.blue('  Contextuate Monitor Setup'));
    console.log(chalk.blue('=========================================='));
    console.log('');

    try {
        // Check for existing configuration
        const existingConfig = await loadConfig();
        if (existingConfig) {
            const { overwrite } = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'overwrite',
                    message: 'Configuration already exists. Overwrite?',
                    default: false,
                },
            ]);
            if (!overwrite) {
                console.log(chalk.yellow('[INFO] Setup cancelled.'));
                return;
            }
        }

        // Step 1: Choose mode
        const { mode } = await inquirer.prompt([
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

        const config: MonitorConfig = { ...DEFAULT_CONFIG, mode: mode as MonitorMode };

        // Step 2: Redis configuration (if selected)
        if (mode === 'redis') {
            console.log('');
            console.log(chalk.blue('[INFO] Configure Redis connection:'));

            const redisAnswers = await inquirer.prompt([
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
        console.log(chalk.blue('[INFO] Configure server ports:'));

        const serverAnswers = await inquirer.prompt([
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
        console.log(chalk.blue('[INFO] Configure data persistence:'));

        const { persistenceType } = await inquirer.prompt([
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
            type: persistenceType as PersistenceType,
        };

        // Step 5: Socket path (local mode only)
        if (mode === 'local') {
            const { socketPath } = await inquirer.prompt([
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
        console.log(chalk.green(`[OK] Configuration saved to ${CONFIG_FILE}`));

        // Step 6: Install hook script
        console.log('');
        console.log(chalk.blue('[INFO] Installing hook script...'));

        await fs.ensureDir(HOOKS_DIR);

        // Find the hook script source
        let hookSource = path.join(__dirname, '../monitor/hooks/emit-event.js');
        if (!await fs.pathExists(hookSource)) {
            hookSource = path.join(__dirname, '../../src/monitor/hooks/emit-event.js');
        }

        const hookDest = path.join(HOOKS_DIR, 'emit-event.js');

        if (await fs.pathExists(hookSource)) {
            await fs.copy(hookSource, hookDest);
            await fs.chmod(hookDest, 0o755);
            console.log(chalk.green(`[OK] Hook script installed to ${hookDest}`));
        } else {
            console.log(chalk.yellow(`[WARN] Hook script source not found. You may need to copy it manually.`));
        }

        // Step 7: Ask about Claude settings integration
        console.log('');
        const { hookLocation } = await inquirer.prompt([
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
                ? path.join(process.cwd(), '.claude', 'settings.json')
                : CLAUDE_SETTINGS_FILE;
            await updateClaudeHookSettings(hookDest, settingsFile);
        }

        // Done!
        console.log('');
        console.log(chalk.green('=========================================='));
        console.log(chalk.green('  Setup Complete!'));
        console.log(chalk.green('=========================================='));
        console.log('');
        console.log('Next steps:');
        console.log(`  1. Start the monitor: ${chalk.cyan('contextuate monitor')}`);
        console.log(`  2. Open your browser to: ${chalk.cyan(`http://localhost:${config.server.port}`)}`);
        console.log(`  3. Start a Claude Code session - events will appear in the dashboard`);
        console.log('');

    } catch (error: any) {
        if (error.name === 'ExitPromptError' || error.message?.includes('User force closed')) {
            console.log('');
            console.log(chalk.yellow('Setup cancelled.'));
            return;
        }
        throw error;
    }
}

/**
 * Update Claude settings with hook registrations
 */
async function updateClaudeHookSettings(hookPath: string, settingsFile: string): Promise<void> {
    try {
        const claudeDir = path.dirname(settingsFile);
        await fs.ensureDir(claudeDir);

        let settings: Record<string, unknown> = {};

        if (await fs.pathExists(settingsFile)) {
            try {
                const content = await fs.readFile(settingsFile, 'utf-8');
                settings = JSON.parse(content);
            } catch {
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

        const hooks = settings.hooks as Record<string, unknown[]>;

        // Add our hook to each hook type
        for (const hookType of hookTypes) {
            if (!Array.isArray(hooks[hookType])) {
                hooks[hookType] = [];
            }

            // Check if our hook is already registered (look inside the hooks array)
            const existing = hooks[hookType].find((entry: any) =>
                entry.hooks?.some((h: any) => h.type === 'command' && h.command === hookPath)
            );

            if (!existing) {
                hooks[hookType].push(hookEntry);
            }
        }

        // Save settings
        await fs.writeFile(settingsFile, JSON.stringify(settings, null, 2));
        console.log(chalk.green(`[OK] Hooks registered in ${settingsFile}`));

    } catch (err) {
        console.log(chalk.yellow(`[WARN] Could not update Claude settings: ${err}`));
    }
}

/**
 * Start monitor server command
 */
export async function monitorStartCommand(options: {
    port?: number;
    wsPort?: number;
    noOpen?: boolean;
}): Promise<void> {
    // Load configuration
    let config = await loadConfig();

    if (!config) {
        console.log(chalk.yellow('[WARN] No configuration found. Running init...'));
        console.log('');
        await monitorInitCommand();
        config = await loadConfig();
        if (!config) {
            console.log(chalk.red('[ERROR] Setup failed or cancelled.'));
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

    console.log(chalk.blue('[INFO] Starting Contextuate Monitor...'));
    console.log('');

    try {
        // Dynamically import the server module
        const { createMonitorServer } = await import('../monitor/server');

        const server = await createMonitorServer({ config });
        await server.start();

        // Open browser if not disabled
        if (!options.noOpen) {
            const url = `http://localhost:${config.server.port}`;
            console.log(chalk.blue(`[INFO] Opening browser: ${url}`));

            // Platform-specific browser open
            const { exec } = await import('child_process');
            const platform = process.platform;
            const command = platform === 'darwin' ? 'open' :
                platform === 'win32' ? 'start' : 'xdg-open';

            exec(`${command} ${url}`, (err) => {
                if (err) {
                    console.log(chalk.yellow(`[WARN] Could not open browser automatically.`));
                    console.log(chalk.yellow(`       Please open ${url} manually.`));
                }
            });
        }

        // Handle shutdown signals
        const shutdown = async () => {
            console.log('');
            console.log(chalk.blue('[INFO] Shutting down...'));
            await server.stop();
            process.exit(0);
        };

        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);

        // Keep running
        console.log(chalk.green('[OK] Monitor is running. Press Ctrl+C to stop.'));

    } catch (err: any) {
        console.error(chalk.red(`[ERROR] Failed to start server: ${err.message}`));
        process.exit(1);
    }
}

/**
 * Show monitor status command
 */
export async function monitorStatusCommand(): Promise<void> {
    const config = await loadConfig();

    console.log(chalk.blue(''));
    console.log(chalk.blue('=========================================='));
    console.log(chalk.blue('  Contextuate Monitor Status'));
    console.log(chalk.blue('=========================================='));
    console.log('');

    if (!config) {
        console.log(chalk.yellow('Status: Not configured'));
        console.log('');
        console.log(`Run ${chalk.cyan('contextuate monitor init')} to set up the monitor.`);
        return;
    }

    // Configuration info
    console.log(chalk.white('Configuration:'));
    console.log(`  Mode:        ${chalk.cyan(config.mode)}`);
    console.log(`  HTTP Port:   ${chalk.cyan(config.server.port)}`);
    console.log(`  WS Port:     ${chalk.cyan(config.server.wsPort)}`);

    if (config.mode === 'redis') {
        console.log(`  Redis:       ${chalk.cyan(`${config.redis.host}:${config.redis.port}`)}`);
    } else {
        console.log(`  Socket:      ${chalk.cyan(config.socketPath)}`);
    }

    console.log(`  Persistence: ${chalk.cyan(config.persistence.type)}`);
    console.log('');

    // Check if server is running
    console.log(chalk.white('Server Status:'));

    try {
        const response = await fetch(`http://localhost:${config.server.port}/api/status`);
        if (response.ok) {
            const status = await response.json() as {
                status: string;
                sessions: number;
                activeSessions: number;
                uptime: number;
            };
            console.log(`  Status:      ${chalk.green('Running')}`);
            console.log(`  Sessions:    ${chalk.cyan(status.sessions)} total, ${chalk.cyan(status.activeSessions)} active`);
            console.log(`  Uptime:      ${chalk.cyan(formatUptime(status.uptime))}`);
            console.log('');
            console.log(`Dashboard: ${chalk.cyan(`http://localhost:${config.server.port}`)}`);
        } else {
            console.log(`  Status:      ${chalk.red('Error (HTTP ' + response.status + ')')}`);
        }
    } catch (err) {
        console.log(`  Status:      ${chalk.yellow('Not running')}`);
        console.log('');
        console.log(`Start with: ${chalk.cyan('contextuate monitor')}`);
    }

    console.log('');
}

/**
 * Format uptime in human-readable form
 */
function formatUptime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${secs}s`);

    return parts.join(' ');
}
