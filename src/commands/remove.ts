import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs-extra';

export async function removeCommand(options: { force?: boolean }) {
    console.log(chalk.blue('╔════════════════════════════════════════╗'));
    console.log(chalk.blue('║     Contextuate Removal                ║'));
    console.log(chalk.blue('║     AI Context Framework               ║'));
    console.log(chalk.blue('╚════════════════════════════════════════╝'));
    console.log('');

    if (!options.force) {
        const { confirmRemoval } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirmRemoval',
                message: 'This will remove all Contextuate generated files and symlinks. Continue?',
                default: false,
            },
        ]);

        if (!confirmRemoval) {
            console.log(chalk.blue('[INFO] Removal cancelled.'));
            return;
        }
    }

    console.log(chalk.blue('[INFO] Removing Contextuate files...'));
    console.log('');

    // 1. Remove jump files
    console.log(chalk.blue('[INFO] Removing platform jump files...'));

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
        if (fs.existsSync(file)) {
            await fs.remove(file);
            console.log(chalk.green(`[OK] Removed: ${file}`));
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
        if (fs.existsSync(dir)) {
            const files = await fs.readdir(dir);
            if (files.length === 0) {
                await fs.remove(dir);
                console.log(chalk.green(`[OK] Removed empty directory: ${dir}`));
            }
        }
    }
    console.log('');

    // 2. Remove .claude symlinks (only if they are symlinks)
    console.log(chalk.blue('[INFO] Removing platform symlinks...'));

    const symlinks = [
        '.claude/commands',
        '.claude/agents',
    ];

    for (const linkPath of symlinks) {
        if (fs.existsSync(linkPath)) {
            try {
                const stats = await fs.lstat(linkPath);
                if (stats.isSymbolicLink()) {
                    await fs.remove(linkPath);
                    console.log(chalk.green(`[OK] Removed symlink: ${linkPath}`));
                } else {
                    console.log(chalk.yellow(`[WARN] Skipped (not a symlink): ${linkPath}`));
                }
            } catch (error) {
                console.log(chalk.yellow(`[WARN] Could not check: ${linkPath}`));
            }
        }
    }

    // Remove .claude directory if empty
    if (fs.existsSync('.claude')) {
        const files = await fs.readdir('.claude');
        if (files.length === 0) {
            await fs.remove('.claude');
            console.log(chalk.green('[OK] Removed empty directory: .claude'));
        } else {
            console.log(chalk.yellow('[WARN] .claude directory not empty, keeping it'));
        }
    }
    console.log('');

    // 3. Remove framework files
    console.log(chalk.blue('[INFO] Removing framework files...'));

    if (fs.existsSync('docs/ai/.contextuate')) {
        await fs.remove('docs/ai/.contextuate');
        console.log(chalk.green('[OK] Removed: docs/ai/.contextuate/'));
    }

    if (fs.existsSync('docs/ai/contextuate.md')) {
        await fs.remove('docs/ai/contextuate.md');
        console.log(chalk.green('[OK] Removed: docs/ai/contextuate.md'));
    }

    if (fs.existsSync('docs/ai/tasks')) {
        await fs.remove('docs/ai/tasks');
        console.log(chalk.green('[OK] Removed: docs/ai/tasks/'));
    }
    console.log('');

    console.log(chalk.green('╔════════════════════════════════════════╗'));
    console.log(chalk.green('║     Removal Complete!                  ║'));
    console.log(chalk.green('╚════════════════════════════════════════╝'));
    console.log('');
    console.log('The following were preserved:');
    console.log('');
    console.log(`  - ${chalk.blue('docs/ai/context.md')} (your project context)`);
    console.log(`  - ${chalk.blue('docs/ai/agents/')} (your custom agents)`);
    console.log(`  - ${chalk.blue('docs/ai/standards/')} (your coding standards)`);
    console.log(`  - ${chalk.blue('docs/ai/quickrefs/')} (your quick references)`);
    console.log(`  - ${chalk.blue('docs/ai/commands/')} (your custom commands)`);
    console.log('');
    console.log('To reinstall, run: contextuate init');
    console.log('');
}
