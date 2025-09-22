import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { logApiRequest, logApiResponse, logFilesystemOperation } from '@/lib/utils/terminalLogger';
import { logServerInfo, logServerError } from '@/lib/server/ServerLogger';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let targetPath = '';
  
  try {
    const body = await request.json();
    targetPath = body.path;
    
    // Log de la requête
    logApiRequest('ls', targetPath);
    await logServerInfo('filesystem', `ls command requested for path: ${targetPath}`, { path: targetPath });
    
    // Sécuriser le chemin - seulement dans le workspace
    const workspacePath = path.join(process.cwd(), 'workspace');
    // Si le chemin commence par /workspace, on le traite comme relatif au workspace
    const relativePath = targetPath.startsWith('/workspace') 
      ? targetPath.substring('/workspace'.length).replace(/^\//, '') 
      : targetPath;
    const fullPath = path.resolve(workspacePath, relativePath);
    
    // Vérifier que le chemin est dans le workspace
    if (!fullPath.startsWith(workspacePath)) {
      const duration = Date.now() - startTime;
      logApiResponse('ls', targetPath, false, duration, null, 'Chemin non autorisé');
      logFilesystemOperation('ls', targetPath, false, { error: 'Chemin non autorisé', fullPath });
      return NextResponse.json({ error: 'Chemin non autorisé' }, { status: 403 });
    }
    
    const files = await fs.readdir(fullPath, { withFileTypes: true });
    
    const fileList = await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(fullPath, file.name);
        const stats = await fs.stat(filePath);
        
        return {
          name: file.name,
          type: file.isDirectory() ? 'directory' : 'file',
          size: stats.size,
          modified: stats.mtime.toISOString()
        };
      })
    );
    
    // Trier : dossiers d'abord, puis fichiers
    fileList.sort((a, b) => {
      if (a.type === 'directory' && b.type === 'file') return -1;
      if (a.type === 'file' && b.type === 'directory') return 1;
      return a.name.localeCompare(b.name);
    });
    
    const duration = Date.now() - startTime;
    const result = {
      files: fileList,
      count: fileList.length,
      directories: fileList.filter(f => f.type === 'directory').length,
      files_count: fileList.filter(f => f.type === 'file').length
    };
    
    // Log du succès
    logApiResponse('ls', targetPath, true, duration, result);
    logFilesystemOperation('ls', targetPath, true, { 
      fileCount: fileList.length,
      directoryCount: result.directories,
      fileCount: result.files_count
    });
    await logServerInfo('filesystem', `ls command completed successfully`, { 
      path: targetPath, 
      duration, 
      fileCount: fileList.length,
      directoryCount: result.directories 
    });
    
    return NextResponse.json(fileList);
    
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Log de l'erreur
    logApiResponse('ls', targetPath, false, duration, null, errorMessage);
    logFilesystemOperation('ls', targetPath, false, { 
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    });
    await logServerError('filesystem', `ls command failed: ${errorMessage}`, { 
      path: targetPath, 
      duration, 
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    });
    
    console.error('Erreur ls:', error);
    return NextResponse.json({ error: 'Erreur lors de la lecture du répertoire' }, { status: 500 });
  }
}