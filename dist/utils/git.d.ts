export declare class GitManager {
    private cwd;
    constructor(cwd: string);
    isGitRepo(): Promise<boolean>;
    getCurrentBranch(): Promise<string>;
    createWorktree(agentName: string, sessionId: string): Promise<string>;
    removeWorktree(worktreePath: string, deleteBranch?: boolean): Promise<void>;
    commitChanges(worktreePath: string, message: string): Promise<void>;
}
