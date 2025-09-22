/**
 * Système de logs côté serveur pour le Terminal Algareth
 * Les logs sont persistés dans des fichiers que l'IA peut lire
 */

import fs from 'fs/promises';
import path from 'path';

export type LogLevel = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR';

export interface ServerLogEntry {
  timestamp: string;
  level: LogLevel;
  logger: string;
  message: string;
  data?: any;
  sessionId?: string;
  userId?: string;
}

class ServerLogger {
  private logDir: string;
  private maxFileSize: number = 10 * 1024 * 1024; // 10MB
  private maxFiles: number = 5;

  constructor(logDir: string = 'logs') {
    this.logDir = path.join(process.cwd(), logDir);
    this.ensureLogDir();
  }

  private async ensureLogDir(): Promise<void> {
    try {
      await fs.mkdir(this.logDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create log directory:', error);
    }
  }

  private getLogFileName(logger: string): string {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return path.join(this.logDir, `${logger}_${date}.log`);
  }

  private async rotateLogFile(filePath: string): Promise<void> {
    try {
      const stats = await fs.stat(filePath);
      if (stats.size > this.maxFileSize) {
        // Créer un fichier de rotation
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const rotatedPath = filePath.replace('.log', `_${timestamp}.log`);
        await fs.rename(filePath, rotatedPath);
        
        // Supprimer les anciens fichiers
        await this.cleanupOldLogs(filePath);
      }
    } catch (error) {
      // Fichier n'existe pas encore, pas de problème
    }
  }

  private async cleanupOldLogs(basePath: string): Promise<void> {
    try {
      const dir = path.dirname(basePath);
      const baseName = path.basename(basePath, '.log');
      const files = await fs.readdir(dir);
      
      const logFiles = files
        .filter(file => file.startsWith(baseName) && file.endsWith('.log'))
        .map(file => ({
          name: file,
          path: path.join(dir, file)
        }))
        .sort((a, b) => b.name.localeCompare(a.name)); // Plus récent en premier
      
      // Garder seulement les N fichiers les plus récents
      const filesToDelete = logFiles.slice(this.maxFiles);
      for (const file of filesToDelete) {
        try {
          await fs.unlink(file.path);
        } catch (error) {
          console.error(`Failed to delete old log file ${file.path}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old logs:', error);
    }
  }

  async log(level: LogLevel, logger: string, message: string, data?: any, sessionId?: string): Promise<void> {
    const entry: ServerLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      logger,
      message,
      data,
      sessionId
    };

    const logLine = JSON.stringify(entry) + '\n';
    const logFile = this.getLogFileName(logger);

    try {
      await this.rotateLogFile(logFile);
      await fs.appendFile(logFile, logLine, 'utf8');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  async getLogs(logger: string, limit: number = 100): Promise<ServerLogEntry[]> {
    const logFile = this.getLogFileName(logger);
    
    try {
      const content = await fs.readFile(logFile, 'utf8');
      const lines = content.trim().split('\n').filter(line => line.trim());
      const entries = lines
        .map(line => {
          try {
            return JSON.parse(line) as ServerLogEntry;
          } catch {
            return null;
          }
        })
        .filter(entry => entry !== null)
        .slice(-limit);
      
      return entries;
    } catch (error) {
      return [];
    }
  }

  async getAllLogs(limit: number = 100): Promise<Record<string, ServerLogEntry[]>> {
    try {
      const files = await fs.readdir(this.logDir);
      const logFiles = files.filter(file => file.endsWith('.log'));
      const result: Record<string, ServerLogEntry[]> = {};

      for (const file of logFiles) {
        const logger = file.replace(/_\d{4}-\d{2}-\d{2}\.log$/, '');
        result[logger] = await this.getLogs(logger, limit);
      }

      return result;
    } catch (error) {
      return {};
    }
  }

  async clearLogs(logger?: string): Promise<void> {
    try {
      if (logger) {
        const logFile = this.getLogFileName(logger);
        await fs.unlink(logFile);
      } else {
        const files = await fs.readdir(this.logDir);
        const logFiles = files.filter(file => file.endsWith('.log'));
        for (const file of logFiles) {
          await fs.unlink(path.join(this.logDir, file));
        }
      }
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  }

  async getLogStats(): Promise<Record<string, any>> {
    try {
      const files = await fs.readdir(this.logDir);
      const logFiles = files.filter(file => file.endsWith('.log'));
      const stats: Record<string, any> = {};

      for (const file of logFiles) {
        const logger = file.replace(/_\d{4}-\d{2}-\d{2}\.log$/, '');
        const filePath = path.join(this.logDir, file);
        const fileStats = await fs.stat(filePath);
        
        stats[logger] = {
          file: file,
          size: fileStats.size,
          modified: fileStats.mtime.toISOString(),
          entries: await this.getLogs(logger, 1000).then(logs => logs.length)
        };
      }

      return stats;
    } catch (error) {
      return {};
    }
  }
}

// Instance globale
const serverLogger = new ServerLogger();

export default serverLogger;

// Fonctions de convenance
export const logServerInfo = (logger: string, message: string, data?: any, sessionId?: string) => 
  serverLogger.log('INFO', logger, message, data, sessionId);

export const logServerError = (logger: string, message: string, data?: any, sessionId?: string) => 
  serverLogger.log('ERROR', logger, message, data, sessionId);

export const logServerWarning = (logger: string, message: string, data?: any, sessionId?: string) => 
  serverLogger.log('WARNING', logger, message, data, sessionId);

export const logServerDebug = (logger: string, message: string, data?: any, sessionId?: string) => 
  serverLogger.log('DEBUG', logger, message, data, sessionId);