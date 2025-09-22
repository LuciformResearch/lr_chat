/**
 * Types communs pour LR_TchatAgent Web
 */

export type JsonLike = Record<string, any> | any[];

export interface ApiKeyInfo {
  present: boolean;
  preview: string;
}

export interface SecureEnvConfig {
  projectPaths?: string[];
  userFile?: string;
}

export interface LogLevel {
  level: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR';
}

export interface LoggerConfig {
  logLevel?: string;
  logFile?: string;
  logDir?: string;
}