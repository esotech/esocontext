/**
 * Claude Wrapper Command
 *
 * Wraps the Claude CLI with a PTY to enable:
 * - Full terminal output streaming to the monitor
 * - Remote input injection from the monitor UI
 * - Session state tracking (processing vs waiting for input)
 *
 * Usage: contextuate claude [claude-args...]
 */

import * as pty from 'node-pty';
import * as net from 'net';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// Daemon socket path
const DAEMON_SOCKET = '/tmp/contextuate-daemon.sock';

// Wrapper session state
interface WrapperSession {
  id: string;
  claudeSessionId: string | null;
  ptyProcess: pty.IPty;
  state: 'starting' | 'processing' | 'waiting_input' | 'ended';
  daemonConnection: net.Socket | null;
}

let session: WrapperSession | null = null;

/**
 * Connect to the daemon and register this wrapper session
 */
function connectToDaemon(wrapperId: string): Promise<net.Socket | null> {
  return new Promise((resolve) => {
    // Check if daemon socket exists
    if (!fs.existsSync(DAEMON_SOCKET)) {
      console.error('[Wrapper] Daemon not running. Start with: contextuate monitor');
      resolve(null);
      return;
    }

    const socket = new net.Socket();

    socket.connect(DAEMON_SOCKET, () => {
      console.error('[Wrapper] Connected to daemon');

      // Register this wrapper session
      const registration = {
        type: 'wrapper_register',
        wrapperId,
        pid: process.pid,
        tty: process.stdout.isTTY ? (process.stdout as any).fd : null,
      };
      socket.write(JSON.stringify(registration) + '\n');
      resolve(socket);
    });

    socket.on('error', (err) => {
      console.error('[Wrapper] Could not connect to daemon:', err.message);
      resolve(null);
    });
  });
}

/**
 * Handle messages from daemon (input injection)
 */
function handleDaemonMessage(data: Buffer) {
  if (!session) return;

  try {
    const lines = data.toString().split('\n').filter(l => l.trim());

    for (const line of lines) {
      const message = JSON.parse(line);

      switch (message.type) {
        case 'inject_input':
          // Only inject if we're waiting for input
          if (session.state === 'waiting_input') {
            console.error(`[Wrapper] Injecting input from monitor: ${message.input.slice(0, 50)}...`);
            session.ptyProcess.write(message.input);
            if (!message.input.endsWith('\n') && !message.input.endsWith('\r')) {
              session.ptyProcess.write('\r');
            }
            session.state = 'processing';
          } else {
            console.error(`[Wrapper] Ignoring input - not waiting (state: ${session.state})`);
          }
          break;

        case 'state_update':
          // Daemon is telling us about state change (from hooks)
          if (message.state === 'waiting_input') {
            session.state = 'waiting_input';
            notifyDaemon({ type: 'state_changed', state: 'waiting_input' });
          }
          break;

        case 'ping':
          notifyDaemon({ type: 'pong', wrapperId: session.id });
          break;
      }
    }
  } catch (err) {
    // Ignore parse errors for partial messages
  }
}

/**
 * Send notification to daemon
 */
function notifyDaemon(message: Record<string, unknown>) {
  if (session?.daemonConnection?.writable) {
    session.daemonConnection.write(JSON.stringify(message) + '\n');
  }
}

/**
 * Stream output to daemon for logging
 */
function streamOutputToDaemon(data: string) {
  if (session?.daemonConnection?.writable) {
    notifyDaemon({
      type: 'output',
      wrapperId: session.id,
      data,
      timestamp: Date.now(),
    });
  }
}

/**
 * Detect if Claude is waiting for input based on output patterns
 * This is a heuristic - hooks provide more reliable state info
 */
function detectInputPrompt(data: string): boolean {
  // Common patterns when Claude is waiting for input
  const waitingPatterns = [
    />\s*$/,                          // Simple prompt
    /\?\s*$/,                         // Question prompt
    /What would you like/i,           // Explicit question
    /Enter your/i,                    // Input request
    /Press Enter/i,                   // Enter prompt
    /\[Y\/n\]/i,                      // Yes/no prompt
    /\(y\/N\)/i,                      // Yes/no prompt variant
  ];

  return waitingPatterns.some(pattern => pattern.test(data));
}

/**
 * Main wrapper function
 */
export async function claudeCommand(args: string[]): Promise<void> {
  // Generate wrapper session ID
  const wrapperId = uuidv4().slice(0, 8);

  console.error(`[Wrapper] Starting Claude wrapper (ID: ${wrapperId})`);

  // Find claude executable
  const claudePath = findClaudeExecutable();
  if (!claudePath) {
    console.error('[Wrapper] Claude CLI not found. Please install Claude Code.');
    process.exit(1);
  }

  // Connect to daemon
  const daemonSocket = await connectToDaemon(wrapperId);

  // Get terminal size
  const cols = process.stdout.columns || 120;
  const rows = process.stdout.rows || 40;

  // Spawn Claude with PTY
  const ptyProcess = pty.spawn(claudePath, args, {
    name: 'xterm-256color',
    cols,
    rows,
    cwd: process.cwd(),
    env: {
      ...process.env,
      CONTEXTUATE_WRAPPER_ID: wrapperId,
    },
  });

  // Initialize session
  session = {
    id: wrapperId,
    claudeSessionId: null,
    ptyProcess,
    state: 'starting',
    daemonConnection: daemonSocket,
  };

  // Notify daemon of session start
  notifyDaemon({
    type: 'wrapper_started',
    wrapperId,
    pid: ptyProcess.pid,
    cwd: process.cwd(),
    args,
  });

  // Handle PTY output
  let outputBuffer = '';
  ptyProcess.onData((data) => {
    // Write to actual terminal (user sees output)
    process.stdout.write(data);

    // Stream to daemon for logging
    streamOutputToDaemon(data);

    // Buffer for pattern detection
    outputBuffer += data;
    if (outputBuffer.length > 1000) {
      outputBuffer = outputBuffer.slice(-500);
    }

    // Heuristic: detect if waiting for input
    // (This supplements hook-based detection)
    if (session && session.state === 'processing') {
      if (detectInputPrompt(outputBuffer)) {
        session.state = 'waiting_input';
        notifyDaemon({ type: 'state_changed', state: 'waiting_input', wrapperId });
        outputBuffer = '';
      }
    }
  });

  // Handle daemon messages
  if (daemonSocket) {
    daemonSocket.on('data', handleDaemonMessage);

    daemonSocket.on('close', () => {
      console.error('[Wrapper] Daemon connection closed');
      if (session) {
        session.daemonConnection = null;
      }
    });

    daemonSocket.on('error', (err) => {
      console.error('[Wrapper] Daemon connection error:', err.message);
    });
  }

  // Handle terminal resize
  process.stdout.on('resize', () => {
    if (session?.ptyProcess) {
      const newCols = process.stdout.columns || 120;
      const newRows = process.stdout.rows || 40;
      session.ptyProcess.resize(newCols, newRows);
    }
  });

  // Handle user input from terminal
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }
  process.stdin.resume();

  process.stdin.on('data', (data) => {
    if (!session?.ptyProcess) return;

    // Allow local input - we don't block it, but we track state
    // The blocking is more for remote input to prevent race conditions
    session.ptyProcess.write(data.toString());

    // If user typed something, assume we're processing
    if (session.state === 'waiting_input') {
      session.state = 'processing';
      notifyDaemon({ type: 'state_changed', state: 'processing', wrapperId: session.id });
    }
  });

  // Handle PTY exit
  ptyProcess.onExit(({ exitCode, signal }) => {
    console.error(`[Wrapper] Claude exited (code: ${exitCode}, signal: ${signal})`);

    notifyDaemon({
      type: 'wrapper_ended',
      wrapperId,
      exitCode,
      signal,
    });

    // Cleanup
    if (session?.daemonConnection) {
      session.daemonConnection.end();
    }

    // Restore terminal
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }

    process.exit(exitCode || 0);
  });

  // Handle process signals
  const cleanup = () => {
    if (session?.ptyProcess) {
      session.ptyProcess.kill();
    }
  };

  process.on('SIGINT', () => {
    // Forward Ctrl+C to Claude
    if (session?.ptyProcess) {
      session.ptyProcess.write('\x03');
    }
  });

  process.on('SIGTERM', cleanup);
  process.on('SIGHUP', cleanup);

  // After a brief startup, mark as waiting for input or processing
  setTimeout(() => {
    if (session && session.state === 'starting') {
      // If started with -p flag, we're processing
      // Otherwise, we're likely waiting for input
      if (args.includes('-p') || args.includes('--prompt')) {
        session.state = 'processing';
      } else {
        session.state = 'waiting_input';
      }
      notifyDaemon({ type: 'state_changed', state: session.state, wrapperId });
    }
  }, 1000);
}

/**
 * Find the claude executable
 */
function findClaudeExecutable(): string | null {
  // Common locations
  const locations = [
    // Global npm install
    path.join(os.homedir(), '.npm-global', 'bin', 'claude'),
    // Homebrew (macOS)
    '/opt/homebrew/bin/claude',
    '/usr/local/bin/claude',
    // Linux
    '/usr/bin/claude',
    // In PATH - try which/where
  ];

  for (const loc of locations) {
    if (fs.existsSync(loc)) {
      return loc;
    }
  }

  // Try to find in PATH using which (Unix) or where (Windows)
  try {
    const { execSync } = require('child_process');
    const result = execSync('which claude 2>/dev/null || where claude 2>/dev/null', {
      encoding: 'utf8',
      timeout: 5000,
    }).trim().split('\n')[0];

    if (result && fs.existsSync(result)) {
      return result;
    }
  } catch {
    // Ignore errors
  }

  return null;
}
