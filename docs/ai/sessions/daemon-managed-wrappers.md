# Daemon-Managed Wrapper Architecture

**Date:** 2026-01-02
**Branch:** `feature/monitor-input`
**Status:** Implementation Complete, Ready for Testing

## Overview

Implemented a daemon-managed PTY wrapper architecture that allows Claude sessions to persist even after the `contextuate claude` command exits. The daemon now owns and manages all PTY sessions, enabling remote input injection from the monitor UI.

## Problem Solved

Previously, the `contextuate claude` command would spawn a PTY and manage it directly. This meant:
- Sessions died when the command exited
- No way to reconnect to a session
- Orphaned sessions couldn't be cleaned up

## New Architecture

```
┌─────────────────────┐     spawn_wrapper     ┌─────────────────────┐
│ contextuate claude  │ ──────────────────►   │      Daemon         │
│   (sends & exits)   │                       │                     │
└─────────────────────┘                       │  ┌───────────────┐  │
                                              │  │WrapperManager │  │
┌─────────────────────┐     WebSocket         │  │               │  │
│    Monitor UI       │ ◄────────────────►    │  │ ┌───────────┐ │  │
│   (xterm.js)        │                       │  │ │ PTY #1    │ │  │
└─────────────────────┘                       │  │ │ PTY #2    │ │  │
                                              │  │ └───────────┘ │  │
┌─────────────────────┐     list/kill         │  └───────────────┘  │
│ contextuate wrapper │ ──────────────────►   │                     │
│   list / kill       │                       └─────────────────────┘
└─────────────────────┘
```

## Files Modified

### 1. `src/monitor/daemon/wrapper-manager.ts` (NEW)

New class that manages Claude wrapper sessions with PTY:

```typescript
export class WrapperManager {
  private wrappers: Map<string, WrapperSession> = new Map();
  private persistPath: string;
  private onEvent: WrapperEventCallback;

  // Core methods
  async spawn(options): Promise<string>      // Spawn new Claude PTY session
  writeInput(wrapperId, input): boolean      // Send input to PTY
  resize(wrapperId, cols, rows): boolean     // Resize PTY
  kill(wrapperId): boolean                   // Kill a session
  getAll(): WrapperSession[]                 // Get all active sessions
  async shutdown(): Promise<void>            // Clean shutdown

  // Internal
  private async persist(): Promise<void>     // Save to disk
  private async loadAndCleanup(): Promise<void>  // Load and clean dead sessions
}
```

Key features:
- Sessions persisted to `~/.contextuate/monitor/wrappers.json`
- On startup, checks for orphaned sessions (dead PIDs) and cleans up
- Emits events for output, state changes, start, and end
- Heuristic detection of "waiting for input" state

### 2. `src/monitor/daemon/index.ts` (MODIFIED)

Integrated WrapperManager into daemon:

```typescript
// Line 49: New instance variable
private wrapperManager: WrapperManager;

// Line 60-63: Initialize in constructor
const wrapperPersistPath = path.join(PATHS.baseDir, 'wrappers.json');
this.wrapperManager = new WrapperManager(wrapperPersistPath, (event) => {
  this.handleWrapperManagerEvent(event);
});

// Line 141: Initialize on start
await this.wrapperManager.initialize();

// Line 167: Shutdown on stop
await this.wrapperManager.shutdown();
```

New message handlers:
- `spawn_wrapper` - Spawn a new PTY session (line 303-306)
- `kill_wrapper` - Kill a session (line 309-312)
- `get_wrappers` - List all sessions (line 315-318)

Updated handlers to try managed wrappers first, fallback to legacy:
- `handleInputInjection` (line 454-470)
- `handleWrapperResize` (line 475-492)

### 3. `src/commands/claude.ts` (REWRITTEN)

Now sends spawn request to daemon instead of managing PTY:

```typescript
export async function claudeCommand(args: string[]): Promise<void> {
  const cwd = process.cwd();
  console.log('Spawning Claude session via daemon...');

  const result = await spawnWrapper(args, cwd);

  if (result.success) {
    console.log(`\nClaude session started: ${result.wrapperId}`);
    console.log('The session is now running in the background, managed by the daemon.');
    console.log('Access it via the monitor UI at http://localhost:3456');
  } else {
    console.error(`\nFailed to spawn Claude session: ${result.error}`);
    process.exit(1);
  }
}
```

New exported functions:
- `listWrappersCommand()` - List active wrapper sessions
- `killWrapperCommand(wrapperId)` - Kill a wrapper session

### 4. `src/index.ts` (MODIFIED)

Added wrapper command group (lines 228-242):

```typescript
// Wrapper command group - manage Claude wrapper sessions
const wrapper = program
    .command('wrapper')
    .description('Manage Claude wrapper sessions');

wrapper
    .command('list')
    .description('List active wrapper sessions')
    .action(listWrappersCommand);

wrapper
    .command('kill')
    .argument('<wrapperId>', 'Wrapper ID to kill')
    .description('Kill a wrapper session')
    .action(killWrapperCommand);
```

### 5. `src/types/monitor.ts` (PREVIOUSLY MODIFIED)

Added `resize_wrapper` to ClientMessage union (line 319):

```typescript
| { type: 'resize_wrapper'; wrapperId: string; cols: number; rows: number };
```

## CLI Commands

```bash
# Start the daemon (required for wrappers)
contextuate daemon start

# Spawn a Claude session (spawns and detaches immediately)
contextuate claude [claude-args...]

# List active wrapper sessions
contextuate wrapper list

# Kill a wrapper session
contextuate wrapper kill <wrapperId>

# Start monitor UI (opens browser)
contextuate monitor
```

## Data Storage

Wrapper sessions persisted to: `~/.contextuate/monitor/wrappers.json`

```json
{
  "wrappers": [
    {
      "wrapperId": "a1b2c3d4",
      "pid": 12345,
      "claudeSessionId": "session-uuid",
      "state": "waiting_input",
      "cwd": "/home/user/project",
      "args": [],
      "startTime": 1735776000000,
      "cols": 120,
      "rows": 40
    }
  ]
}
```

## Testing Checklist

- [ ] Start daemon: `contextuate daemon start`
- [ ] Spawn wrapper: `contextuate claude`
- [ ] Verify wrapper appears in list: `contextuate wrapper list`
- [ ] Open monitor UI and see terminal output
- [ ] Type in xterm.js terminal and verify input reaches Claude
- [ ] Kill wrapper: `contextuate wrapper kill <id>`
- [ ] Restart daemon and verify orphan cleanup works
- [ ] Test multiple concurrent wrappers

## Known Limitations

1. **No PTY reconnection**: If daemon restarts, existing PTY sessions become orphans and are cleaned up. A future enhancement could use tmux/screen for true persistence.

2. **Legacy wrapper support**: The code maintains backward compatibility with "legacy" external wrapper processes that connect via socket. This may be removed in a future version.

3. **Input prompt detection**: The `detectInputPrompt()` heuristic may not catch all cases where Claude is waiting for input.

## Related Prior Work

Before this implementation, we also completed:
- xterm.js integration in WrapperPanel.vue for proper terminal emulation
- Direct PTY passthrough (keyboard capture, no text box)
- Terminal resize synchronization
- Fixed line break issues when typing from webapp

## Next Steps (Optional Enhancements)

1. Add tmux/screen integration for true session persistence across daemon restarts
2. Improve input prompt detection with Claude-specific patterns
3. Add session history/replay functionality
4. Add wrapper filtering/search in the monitor UI
