export interface ToolDefinition {
    name: string;
    content: string;
    path: string;
}
export declare class ToolLoader {
    private toolsDir;
    constructor(projectRoot: string);
    loadTools(capabilities: string[]): Promise<ToolDefinition[]>;
}
