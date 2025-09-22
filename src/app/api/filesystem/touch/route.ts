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
    logApiRequest('touch', targetPath);
    
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
      logApiResponse('touch', targetPath, false, duration, null, 'Chemin non autorisé');
      logFilesystemOperation('touch', targetPath, false, { error: 'Chemin non autorisé', fullPath });
      return NextResponse.json({ error: 'Chemin non autorisé' }, { status: 403 });
    }
    
    // Vérifier si le fichier existe déjà
    try {
      const stats = await fs.stat(fullPath);
      if (stats.isFile()) {
        const duration = Date.now() - startTime;
        logApiResponse('touch', targetPath, true, duration, { message: 'Fichier existe déjà' });
        logFilesystemOperation('touch', targetPath, true, { message: 'Fichier existe déjà', size: stats.size });
        return NextResponse.json({ success: true, message: 'Fichier existe déjà' });
      }
    } catch (statError) {
      // Le fichier n'existe pas, on peut le créer
    }
    
    // Créer le fichier vide
    await fs.writeFile(fullPath, '', 'utf8');
    
    const duration = Date.now() - startTime;
    const result = { success: true, message: 'Fichier créé', path: targetPath };
    
    // Log du succès
    logApiResponse('touch', targetPath, true, duration, result);
    logFilesystemOperation('touch', targetPath, true, { 
      created: true,
      size: 0
    });
    
    return NextResponse.json(result);
    
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Log de l'erreur
    logApiResponse('touch', targetPath, false, duration, null, errorMessage);
    logFilesystemOperation('touch', targetPath, false, { 
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    });
    
    console.error('Erreur touch:', error);
    return NextResponse.json({ error: 'Erreur lors de la création du fichier' }, { status: 500 });
  }
}