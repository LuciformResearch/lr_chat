import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const terminalPath = path.join(process.cwd());
    
    console.log('🛑 Arrêt du terminal minimal...');
    console.log('📁 Dossier:', terminalPath);
    
    // Arrêter les conteneurs
    const { stdout, stderr } = await execAsync('docker compose -f docker-compose.terminal.yml down', { cwd: terminalPath });
    
    console.log('✅ Terminal minimal arrêté');
    console.log('STDOUT:', stdout);
    if (stderr) console.log('STDERR:', stderr);

    return NextResponse.json({ 
      success: true, 
      message: 'Terminal minimal arrêté avec succès',
      output: stdout 
    });

  } catch (error) {
    console.error('❌ Erreur arrêt terminal:', error);
    return NextResponse.json({ 
      error: 'Erreur arrêt terminal', 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}