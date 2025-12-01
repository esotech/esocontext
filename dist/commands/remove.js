"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeCommand = removeCommand;
const inquirer_1 = __importDefault(require("inquirer"));
const chalk_1 = __importDefault(require("chalk"));
const fs_extra_1 = __importDefault(require("fs-extra"));
async function removeCommand(options) {
    console.log(chalk_1.default.blue('╔════════════════════════════════════════╗'));
    console.log(chalk_1.default.blue('║     Contextuate Removal                ║'));
    console.log(chalk_1.default.blue('║     AI Context Framework               ║'));
    console.log(chalk_1.default.blue('╚════════════════════════════════════════╝'));
    console.log('');
    if (!options.force) {
        const { confirmRemoval } = await inquirer_1.default.prompt([
            {
                type: 'confirm',
                name: 'confirmRemoval',
                message: 'This will remove all Contextuate generated files and symlinks. Continue?',
                default: false,
            },
        ]);
        if (!confirmRemoval) {
            console.log(chalk_1.default.blue('[INFO] Removal cancelled.'));
            return;
        }
    }
    console.log(chalk_1.default.blue('[INFO] Removing Contextuate files...'));
    console.log('');
    // 1. Remove jump files
    console.log(chalk_1.default.blue('[INFO] Removing platform jump files...'));
    const jumpFiles = [
        'CLAUDE.md',
        'AGENTS.md',
        'GEMINI.md',
        '.clinerules/cline-memory-bank.md',
        '.github/copilot-instructions.md',
        '.cursor/rules/project.mdc',
        '.windsurf/rules/project.md',
        '.antigravity/rules.md',
    ];
    for (const file of jumpFiles) {
        if (fs_extra_1.default.existsSync(file)) {
            await fs_extra_1.default.remove(file);
            console.log(chalk_1.default.green(`[OK] Removed: ${file}`));
        }
    }
    // Remove empty platform directories
    const platformDirs = [
        '.clinerules',
        '.cursor/rules',
        '.cursor',
        '.windsurf/rules',
        '.windsurf',
        '.antigravity',
        '.github',
    ];
    for (const dir of platformDirs) {
        if (fs_extra_1.default.existsSync(dir)) {
            const files = await fs_extra_1.default.readdir(dir);
            if (files.length === 0) {
                await fs_extra_1.default.remove(dir);
                console.log(chalk_1.default.green(`[OK] Removed empty directory: ${dir}`));
            }
        }
    }
    console.log('');
    // 2. Remove .claude symlinks (only if they are symlinks)
    console.log(chalk_1.default.blue('[INFO] Removing platform symlinks...'));
    const symlinks = [
        '.claude/commands',
        '.claude/agents',
    ];
    for (const linkPath of symlinks) {
        if (fs_extra_1.default.existsSync(linkPath)) {
            try {
                const stats = await fs_extra_1.default.lstat(linkPath);
                if (stats.isSymbolicLink()) {
                    await fs_extra_1.default.remove(linkPath);
                    console.log(chalk_1.default.green(`[OK] Removed symlink: ${linkPath}`));
                }
                else {
                    console.log(chalk_1.default.yellow(`[WARN] Skipped (not a symlink): ${linkPath}`));
                }
            }
            catch (error) {
                console.log(chalk_1.default.yellow(`[WARN] Could not check: ${linkPath}`));
            }
        }
    }
    // Remove .claude directory if empty
    if (fs_extra_1.default.existsSync('.claude')) {
        const files = await fs_extra_1.default.readdir('.claude');
        if (files.length === 0) {
            await fs_extra_1.default.remove('.claude');
            console.log(chalk_1.default.green('[OK] Removed empty directory: .claude'));
        }
        else {
            console.log(chalk_1.default.yellow('[WARN] .claude directory not empty, keeping it'));
        }
    }
    console.log('');
    // 3. Remove framework files
    console.log(chalk_1.default.blue('[INFO] Removing framework files...'));
    if (fs_extra_1.default.existsSync('docs/ai/.contextuate')) {
        await fs_extra_1.default.remove('docs/ai/.contextuate');
        console.log(chalk_1.default.green('[OK] Removed: docs/ai/.contextuate/'));
    }
    if (fs_extra_1.default.existsSync('docs/ai/contextuate.md')) {
        await fs_extra_1.default.remove('docs/ai/contextuate.md');
        console.log(chalk_1.default.green('[OK] Removed: docs/ai/contextuate.md'));
    }
    if (fs_extra_1.default.existsSync('docs/ai/tasks')) {
        await fs_extra_1.default.remove('docs/ai/tasks');
        console.log(chalk_1.default.green('[OK] Removed: docs/ai/tasks/'));
    }
    console.log('');
    console.log(chalk_1.default.green('╔════════════════════════════════════════╗'));
    console.log(chalk_1.default.green('║     Removal Complete!                  ║'));
    console.log(chalk_1.default.green('╚════════════════════════════════════════╝'));
    console.log('');
    console.log('The following were preserved:');
    console.log('');
    console.log(`  - ${chalk_1.default.blue('docs/ai/context.md')} (your project context)`);
    console.log(`  - ${chalk_1.default.blue('docs/ai/agents/')} (your custom agents)`);
    console.log(`  - ${chalk_1.default.blue('docs/ai/standards/')} (your coding standards)`);
    console.log(`  - ${chalk_1.default.blue('docs/ai/quickrefs/')} (your quick references)`);
    console.log(`  - ${chalk_1.default.blue('docs/ai/commands/')} (your custom commands)`);
    console.log('');
    console.log('To reinstall, run: contextuate init');
    console.log('');
}
