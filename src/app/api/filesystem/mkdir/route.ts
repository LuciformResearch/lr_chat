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
    logApiRequest('mkdir', targetPath);
    
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
      logApiResponse('mkdir', targetPath, false, duration, null, 'Chemin non autorisé');
      logFilesystemOperation('mkdir', targetPath, false, { error: 'Chemin non autorisé', fullPath });
      return NextResponse.json({ error: 'Chemin non autorisé' }, { status: 403 });
    }
    
    // Vérifier si le dossier existe déjà
    try {
      const stats = await fs.stat(fullPath);
      if (stats.isDirectory()) {
        const duration = Date.now() - startTime;
        logApiResponse('mkdir', targetPath, true, duration, { message: 'Dossier existe déjà' });
        logFilesystemOperation('mkdir', targetPath, true, { message: 'Dossier existe déjà' });
        return NextResponse.json({ success: true, message: 'Dossier existe déjà' });
      }
    } catch (statError) {
      // Le dossier n'existe pas, on peut le créer
    }
    
    // Créer le dossier
    await fs.mkdir(fullPath, { recursive: true });
    
    const duration = Date.now() - startTime;
    const result = { success: true, message: 'Dossier créé', path: targetPath };
    
    // Log du succès
    logApiResponse('mkdir', targetPath, true, duration, result);
    logFilesystemOperation('mkdir', targetPath, true, { 
      created: true,
      recursive: true
    });
    
    return NextResponse.json(result);
    
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Log de l'erreur
    logApiResponse('mkdir', targetPath, false, duration, null, errorMessage);
    logFilesystemOperation('mkdir', targetPath, false, { 
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    });
    
    console.error('Erreur mkdir:', error);
    return NextResponse.json({ error: 'Erreur lors de la création du dossier' }, { status: 500 });
  }
}