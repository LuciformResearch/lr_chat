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
    logApiRequest('cat', targetPath);
    
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
      logApiResponse('cat', targetPath, false, duration, null, 'Chemin non autorisé');
      logFilesystemOperation('cat', targetPath, false, { error: 'Chemin non autorisé', fullPath });
      return NextResponse.json({ error: 'Chemin non autorisé' }, { status: 403 });
    }
    
    // Vérifier que c'est un fichier (pas un dossier)
    const stats = await fs.stat(fullPath);
    if (stats.isDirectory()) {
      const duration = Date.now() - startTime;
      logApiResponse('cat', targetPath, false, duration, null, 'Chemin pointe vers un dossier');
      logFilesystemOperation('cat', targetPath, false, { error: 'Chemin pointe vers un dossier' });
      return NextResponse.json({ error: 'Impossible de lire un dossier' }, { status: 400 });
    }
    
    const content = await fs.readFile(fullPath, 'utf8');
    const duration = Date.now() - startTime;
    
    const result = {
      contentLength: content.length,
      fileSize: stats.size,
      lastModified: stats.mtime.toISOString()
    };
    
    // Log du succès
    logApiResponse('cat', targetPath, true, duration, result);
    logFilesystemOperation('cat', targetPath, true, { 
      contentLength: content.length,
      fileSize: stats.size
    });
    
    return new NextResponse(content, {
      headers: { 'Content-Type': 'text/plain' }
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Log de l'erreur
    logApiResponse('cat', targetPath, false, duration, null, errorMessage);
    logFilesystemOperation('cat', targetPath, false, { 
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    });
    
    console.error('Erreur cat:', error);
    return NextResponse.json({ error: 'Fichier non trouvé ou erreur de lecture' }, { status: 404 });
  }
}