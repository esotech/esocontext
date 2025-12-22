export interface DriverConfig {
    provider: string;
    model: string;
    capabilities?: string[];
}
export declare class LLMDriver {
    private config;
    private goal;
    private cwd;
    private toolLoader;
    private activeTools;
    private contextFiles;
    constructor(config: DriverConfig, goal: string, cwd: string, contextFiles?: string[]);
    run(): Promise<void>;
    private runMockLoop;
}
