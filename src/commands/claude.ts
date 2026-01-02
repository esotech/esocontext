/**
 * Claude Wrapper Command
 *
 * Spawns a Claude session managed by the daemon.
 * The daemon handles PTY management, so the session persists
 * even after this command exits.
 *
 * Usage: contextuate claude [claude-args...]
 */

import * as net from 'net';
import * as fs from 'fs';

// Daemon socket path
const DAEMON_SOCKET = '/tmp/contextuate-daemon.sock';

/**
 * Connect to daemon and spawn a wrapper
 */
async function spawnWrapper(args: string[], cwd: string): Promise<{ success: boolean; wrapperId?: string; error?: string }> {
  return new Promise((resolve) => {
    // Check if daemon socket exists
    if (!fs.existsSync(DAEMON_SOCKET)) {
      resolve({ success: false, error: 'Daemon not running. Start with: contextuate monitor' });
      return;
    }

    const socket = new net.Socket();
    let responseReceived = false;

    socket.connect(DAEMON_SOCKET, () => {
      // Send spawn request
      const message = {
        type: 'spawn_wrapper',
        args,
        cwd,
        cols: process.stdout.columns || 120,
        rows: process.stdout.rows || 40,
      };
      socket.write(JSON.stringify(message) + '\n');
    });

    socket.on('data', (data) => {
      try {
        const lines = data.toString().split('\n').filter(l => l.trim());
        for (const line of lines) {
          const response = JSON.parse(line);
          if (response.type === 'wrapper_spawned') {
            responseReceived = true;
            socket.end();
            resolve({
              success: response.success,
              wrapperId: response.wrapperId,
              error: response.error,
            });
          }
        }
      } catch (err) {
        // Ignore parse errors
      }
    });

    socket.on('error', (err) => {
      if (!responseReceived) {
        resolve({ success: false, error: `Connection error: ${err.message}` });
      }
    });

    socket.on('close', () => {
      if (!responseReceived) {
        resolve({ success: false, error: 'Connection closed without response' });
      }
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      if (!responseReceived) {
        socket.destroy();
        resolve({ success: false, error: 'Spawn request timed out' });
      }
    }, 10000);
  });
}

/**
 * Main command entry point
 */
export async function claudeCommand(args: string[]): Promise<void> {
  const cwd = process.cwd();

  console.log('Spawning Claude session via daemon...');

  const result = await spawnWrapper(args, cwd);

  if (result.success) {
    console.log(`\nClaude session started: ${result.wrapperId}`);
    console.log('\nThe session is now running in the background, managed by the daemon.');
    console.log('Access it via the monitor UI at http://localhost:3456');
    console.log('\nTo view active wrappers: contextuate wrapper list');
    console.log('To kill a wrapper: contextuate wrapper kill <wrapper-id>');
  } else {
    console.error(`\nFailed to spawn Claude session: ${result.error}`);
    process.exit(1);
  }
}

/**
 * List active wrappers
 */
export async function listWrappersCommand(): Promise<void> {
  return new Promise((resolve) => {
    if (!fs.existsSync(DAEMON_SOCKET)) {
      console.error('Daemon not running. Start with: contextuate monitor');
      process.exit(1);
    }

    const socket = new net.Socket();

    socket.connect(DAEMON_SOCKET, () => {
      socket.write(JSON.stringify({ type: 'get_wrappers' }) + '\n');
    });

    socket.on('data', (data) => {
      try {
        const lines = data.toString().split('\n').filter(l => l.trim());
        for (const line of lines) {
          const response = JSON.parse(line);
          if (response.type === 'wrappers_list') {
            socket.end();

            if (response.wrappers.length === 0) {
              console.log('No active wrapper sessions.');
            } else {
              console.log('Active wrapper sessions:\n');
              for (const wrapper of response.wrappers) {
                const type = wrapper.managed ? 'managed' : 'legacy';
                console.log(`  ${wrapper.wrapperId} [${type}]`);
                console.log(`    State: ${wrapper.state}`);
                console.log(`    PID: ${wrapper.pid}`);
                console.log(`    CWD: ${wrapper.cwd}`);
                if (wrapper.claudeSessionId) {
                  console.log(`    Claude Session: ${wrapper.claudeSessionId.slice(0, 8)}...`);
                }
                console.log();
              }
            }
            resolve();
          }
        }
      } catch (err) {
        // Ignore parse errors
      }
    });

    socket.on('error', (err) => {
      console.error(`Connection error: ${err.message}`);
      process.exit(1);
    });

    setTimeout(() => {
      socket.destroy();
      console.error('Request timed out');
      process.exit(1);
    }, 5000);
  });
}

/**
 * Kill a wrapper session
 */
export async function killWrapperCommand(wrapperId: string): Promise<void> {
  return new Promise((resolve) => {
    if (!fs.existsSync(DAEMON_SOCKET)) {
      console.error('Daemon not running. Start with: contextuate monitor');
      process.exit(1);
    }

    const socket = new net.Socket();

    socket.connect(DAEMON_SOCKET, () => {
      socket.write(JSON.stringify({ type: 'kill_wrapper', wrapperId }) + '\n');
      // Give daemon time to process, then close
      setTimeout(() => {
        socket.end();
        console.log(`Kill request sent for wrapper ${wrapperId}`);
        resolve();
      }, 500);
    });

    socket.on('error', (err) => {
      console.error(`Connection error: ${err.message}`);
      process.exit(1);
    });
  });
}
