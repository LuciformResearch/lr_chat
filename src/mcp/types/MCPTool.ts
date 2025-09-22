/**
 * Types pour les outils MCP (Model Context Protocol)
 */

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
  handler: (args: any) => Promise<any>;
}

export interface MCPToolResult {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
}

export interface MCPToolRegistry {
  [toolName: string]: MCPTool;
}

export interface MCPToolCall {
  tool: string;
  arguments: Record<string, any>;
}

export interface MCPToolResponse {
  tool: string;
  result: MCPToolResult;
}

export interface MCPToolError {
  tool: string;
  error: string;
  timestamp: string;
}

export interface MCPToolValidation {
  valid: boolean;
  errors: string[];
}

export interface MCPToolInfo {
  name: string;
  description: string;
  inputSchema: any;
  examples?: Array<{
    input: Record<string, any>;
    output: any;
  }>;
}