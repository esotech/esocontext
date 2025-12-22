export declare function runCommand(agentName: string, options: {
    dryRun?: boolean;
    isolation?: string;
    goal?: string;
    task?: string;
}): Promise<void>;
