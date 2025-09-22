import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { logApiRequest, logApiResponse, logFilesystemOperation } from '@/lib/utils/terminalLogger';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let targetPath = '';
  
  try {
    const body = await request.json();
    targetPath = body.path;
    
    // Log de la requête
    logApiRequest('rm', targetPath);
    
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
      logApiResponse('rm', targetPath, false, duration, null, 'Chemin non autorisé');
      logFilesystemOperation('rm', targetPath, false, { error: 'Chemin non autorisé', fullPath });
      return NextResponse.json({ error: 'Chemin non autorisé' }, { status: 403 });
    }
    
    // Vérifier que le fichier/dossier existe
    const stats = await fs.stat(fullPath);
    const isDirectory = stats.isDirectory();
    const size = stats.size;
    
    // Supprimer le fichier/dossier
    if (isDirectory) {
      await fs.rmdir(fullPath);
    } else {
      await fs.unlink(fullPath);
    }
    
    const duration = Date.now() - startTime;
    const result = { 
      success: true, 
      message: isDirectory ? 'Dossier supprimé' : 'Fichier supprimé', 
      path: targetPath,
      type: isDirectory ? 'directory' : 'file',
      size: size
    };
    
    // Log du succès
    logApiResponse('rm', targetPath, true, duration, result);
    logFilesystemOperation('rm', targetPath, true, { 
      deleted: true,
      type: isDirectory ? 'directory' : 'file',
      size: size
    });
    
    return NextResponse.json(result);
    
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Log de l'erreur
    logApiResponse('rm', targetPath, false, duration, null, errorMessage);
    logFilesystemOperation('rm', targetPath, false, { 
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    });
    
    console.error('Erreur rm:', error);
    return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 });
  }
}