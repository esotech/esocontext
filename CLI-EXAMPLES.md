# Contextuate Init CLI Usage Examples

## Non-Interactive Mode

### Install specific platform(s)
```bash
# Single platform
contextuate init claude

# Multiple platforms
contextuate init claude gemini

# Fuzzy matching
contextuate init gem wind  # matches gemini and windsurf
```

### Install all platforms
```bash
contextuate init all
```

### Install platform(s) with specific agents
```bash
# Install Claude with specific agents
contextuate init claude --agents base archon

# Install Claude with all agents
contextuate init claude --agents all

# Install multiple platforms with agents
contextuate init claude gemini --agents base archon nexus
```

### Install with force overwrite
```bash
contextuate init claude --force
contextuate init claude --agents all --force
```

## Interactive Mode

### No arguments - full interactive mode
```bash
contextuate init
```

This will prompt for:
1. Platform selection
2. Agent installation (yes/no)
3. Agent selection (if yes to step 2)

## Platform Fuzzy Matching

The following inputs will match correctly:
- `claude` → Claude Code
- `gem` or `gemini` → Google Gemini
- `curs` or `cursor` → Cursor IDE
- `wind` or `windsurf` → Windsurf IDE
- `github` or `copilot` → GitHub Copilot
- `cline` → Cline
- `anti` or `antigravity` → Antigravity
- `agents` → Agents.ai

## Available Platforms
- agents (Agents.ai)
- antigravity (Antigravity)
- claude (Claude Code)
- cline (Cline)
- cursor (Cursor IDE)
- gemini (Google Gemini)
- copilot (GitHub Copilot)
- windsurf (Windsurf IDE)

## Available Agents
- archon
- base
- canvas
- chronos
- documentation-expert
- forge
- ledger
- nexus
- scribe
- tools-expert
- unity
- vox
