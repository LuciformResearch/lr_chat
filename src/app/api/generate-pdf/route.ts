import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

export async function POST(request: NextRequest) {
  try {
    const { html, filename } = await request.json();
    
    if (!html) {
      return NextResponse.json({ error: 'HTML content is required' }, { status: 400 });
    }

    // Lancer Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    
    // Définir la taille de la page
    await page.setViewport({ width: 1200, height: 800 });
    
    // Charger le HTML
    await page.setContent(html, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });

    // Attendre que toutes les images soient chargées (maintenant en base64, donc plus rapide)
    await page.evaluate(() => {
      return Promise.all(
        Array.from(document.images)
          .filter(img => !img.complete)
          .map(img => {
            return new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = reject;
              // Timeout réduit car les images sont en base64
              setTimeout(() => reject(new Error('Image load timeout')), 5000);
            });
          })
      );
    }).catch(error => {
      console.warn('Certaines images n\'ont pas pu être chargées:', error);
      // On continue même si certaines images échouent
    });

    // Générer le PDF avec des options optimisées
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '15mm',
        right: '15mm',
        bottom: '15mm',
        left: '15mm'
      },
      displayHeaderFooter: false,
      preferCSSPageSize: true,
      timeout: 30000
    });

    await browser.close();

    // Retourner le PDF
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename || 'cv.pdf'}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('Erreur lors de la génération du PDF:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la génération du PDF' },
      { status: 500 }
    );
  }
}