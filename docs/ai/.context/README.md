# Esocontext Framework Core

> **DO NOT MODIFY FILES IN THIS DIRECTORY**

This folder contains the core Esocontext framework files. These are managed by the Esocontext installer and will be overwritten during updates.

## What This Contains

- `version.json` - Framework version tracking
- `templates/` - Jump-file templates for all AI platforms
- `agents/` - Standard agent definitions and creation guidelines
- `standards/` - Coding and behavioral standards
- `bin/` - CLI tools (install, update, quickref generation)

## User-Customizable Locations

Your custom content belongs in these locations:

| Purpose | Location |
|---------|----------|
| Project context | `docs/context.md` |
| Project documentation | `docs/` |
| Custom agents | `docs/ai/agents/` |
| Quick references | `docs/ai/quickrefs/` |
| Task tracking | `docs/ai/tasks/` (gitignored) |

## Updating Esocontext

To update to the latest version:

```bash
curl -fsSL https://esocontext.dev/update.sh | bash
```

Or if you have the CLI installed:

```bash
esocontext update
```

## Support

- Documentation: https://esocontext.dev
- Issues: https://github.com/esocontext/esocontext/issues
