import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const terminalPath = path.join(process.cwd());
    
    console.log('🚀 Démarrage du terminal minimal...');
    console.log('📁 Dossier:', terminalPath);
    
    // Arrêter d'abord les conteneurs existants
    try {
      await execAsync('docker compose -f docker-compose.terminal.yml down', { cwd: terminalPath });
    } catch (error) {
      console.log('Aucun conteneur terminal à arrêter');
    }

    // Démarrer les conteneurs
    const { stdout, stderr } = await execAsync('docker compose -f docker-compose.terminal.yml up -d', { cwd: terminalPath });
    
    console.log('✅ Terminal minimal démarré');
    console.log('STDOUT:', stdout);
    if (stderr) console.log('STDERR:', stderr);

    return NextResponse.json({ 
      success: true, 
      message: 'Terminal minimal démarré avec succès',
      output: stdout 
    });

  } catch (error) {
    console.error('❌ Erreur démarrage terminal:', error);
    return NextResponse.json({ 
      error: 'Erreur démarrage terminal', 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}