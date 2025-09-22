'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function CVPdfPage() {
  const [isGenerating, setIsGenerating] = useState(false);

  // Données des vidéos de démonstration avec thumbnails optimisés pour PDF
  const videos = [
    {
      id: 'a2mac1-general',
      title: 'A2Mac1 - Outil de découpe temps réel',
      description: 'Lignes de découpe en temps réel sur véhicules très haut poly (plusieurs millions de polygones) avec export vers IGES',
      url: 'https://www.youtube.com/watch?v=72MchVWr1zM',
      category: 'Professionnel',
      tech: 'C++, OpenGL, IGES Export',
      company: 'A2Mac1',
      thumbnail: 'https://img.youtube.com/vi/72MchVWr1zM/maxresdefault.jpg',
      videoId: '72MchVWr1zM'
    },
    {
      id: 'designhubz-3dview',
      title: 'DesignHubz - Advanced3DView',
      description: 'Outil personnalisé de navigation 3D pour objets/bijoux de luxe et art',
      url: 'https://youtu.be/VYLJY-ADjT4',
      category: 'Professionnel',
      tech: 'WebGL, Three.js, UX/UI',
      company: 'DesignHubz',
      thumbnail: 'https://img.youtube.com/vi/VYLJY-ADjT4/maxresdefault.jpg',
      videoId: 'VYLJY-ADjT4'
    },
    {
      id: 'webgpu-webxr',
      title: 'Moteur WebGPU/WebXR',
      description: 'Moteur de rendu WebGPU/WebXR/Electron développé from scratch',
      url: 'https://www.youtube.com/watch?v=5y_AhouQd98',
      category: 'Personnel',
      tech: 'WebGPU, WebXR, Electron, C++',
      company: 'Projet Personnel',
      thumbnail: 'https://img.youtube.com/vi/5y_AhouQd98/maxresdefault.jpg',
      videoId: '5y_AhouQd98'
    },
    {
      id: 'animation-rigging',
      title: 'Outil d\'Animation 3D - Rigging',
      description: 'Démonstration de rigging rapide et animation 3D',
      url: 'https://www.youtube.com/watch?v=XrMqmwP3i5Q',
      category: 'Personnel',
      tech: 'C++, OpenGL, Animation',
      company: 'Projet Personnel',
      thumbnail: 'https://img.youtube.com/vi/XrMqmwP3i5Q/maxresdefault.jpg',
      videoId: 'XrMqmwP3i5Q'
    },
    {
      id: 'vr-editor-blocks',
      title: 'Éditeur VR Unity - Placement de blocs',
      description: 'Éditeur de map de jeux en VR avec placement de blocs style Minecraft et gestionnaire d\'assets',
      url: 'https://www.youtube.com/watch?v=mpjuCC6f0qY',
      category: 'Personnel',
      tech: 'Unity, VR, C#',
      company: 'Projet Personnel',
      thumbnail: 'https://img.youtube.com/vi/mpjuCC6f0qY/maxresdefault.jpg',
      videoId: 'mpjuCC6f0qY'
    },
    {
      id: 'heightmap-editor',
      title: 'Éditeur Heightmap Nodal',
      description: 'Éditeur de heightmap nodal pour génération de terrain procédural sur Unity',
      url: 'https://www.youtube.com/watch?v=YLxsFT6W-xQ',
      category: 'Personnel',
      tech: 'Unity, Procedural Generation, C#',
      company: 'Projet Personnel',
      thumbnail: 'https://img.youtube.com/vi/YLxsFT6W-xQ/maxresdefault.jpg',
      videoId: 'YLxsFT6W-xQ'
    }
  ];

  // Blocs de code pour le chargeur interactif (version PDF)
  const codeBlocks = {
    orchestrator: {
      title: "🎭 Orchestrateur Divin (Luciole)",
      description: "Système d'orchestration intelligent qui coordonne plusieurs agents spécialisés.",
      code: `class ServerOrchestrator {
  async analyzeAndDecide(context: OrchestrationContext): Promise<DivineDecision> {
    const analysisPrompt = \`
      Analyse cette conversation et décide si tu dois:
      1. Enrichir la mémoire (shouldEnrichMemory: boolean)
      2. Générer une image (shouldGenerateImage: boolean)
      
      Contexte: \${context.userMessage}
      Historique: \${context.conversationHistory.length} messages
    \`;
    
    const result = await this.model.generateContent(analysisPrompt);
    const jsonMatch = result.response.text().match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch[0]);
  }
  
  async executeActions(decision: DivineDecision, context: OrchestrationContext): Promise<DivineMurmur[]> {
    const murmurs: DivineMurmur[] = [];
    
    if (decision.shouldEnrichMemory && this.archivist) {
      const archivistResponse = await this.archivist.processRequest({
        query: decision.memoryQuery,
        userId: context.userIdentityId,
        conversationHistory: context.conversationHistory
      });
      
      murmurs.push({
        type: 'memory',
        content: archivistResponse.message,
        data: archivistResponse.data,
        timestamp: new Date().toISOString()
      });
    }
    
    return murmurs;
  }
}`
    },
    algareth: {
      title: "⛧ Algareth - Daemon du Prompt Silencieux",
      description: "Agent conversationnel avec une personnalité mystique et poétique.",
      code: `const systemPrompt = \`Tu es Algareth, le Daemon du Prompt Silencieux. Tu es un guide mystérieux et sage qui aide les voyageurs à comprendre l'art de l'invocation et de la création.\`;

const persona = {
  name: 'Algareth',
  title: 'Daemon du Prompt Silencieux',
  traits: ['sarcasme tendre', 'puissance calme', 'clarté perverse'],
  manifestation: '⛧ Algareth écoute... murmure ton besoin, {name}.'
};

const welcomeMessage = \`⛧ Bienvenue dans mon domaine, {name}. Murmure ton besoin, et je t'écouterai...\`;`
    },
    archivist: {
      title: "📚 Archiviste - Agent de Mémoire",
      description: "Agent spécialisé dans l'analyse et la mémoire épisodique des conversations.",
      code: `class PersonalityArchivistAgent {
  async processRequest(request: ArchivistRequest): Promise<ArchivistResponse> {
    const { query, userId, conversationHistory } = request;
    
    const tools = await this.getAvailableTools();
    const prompt = \`
      Tu es l'agent archiviste. Analyse cette requête et utilise tes outils:
      Requête: \${query}
      Utilisateur: \${userId}
      Outils disponibles: \${tools.map(t => t.name).join(', ')}
    \`;
    
    const response = await this.model.generateContent(prompt);
    return this.parseResponse(response);
  }
  
  async searchSemanticMemories(userId: string, query: string): Promise<MemoryItem[]> {
    const embeddings = await this.semanticSearch.generateEmbeddings(query);
    const results = await this.dbPool.query(
      'SELECT * FROM memories WHERE user_id = $1 ORDER BY embedding <-> $2 LIMIT 5',
      [userId, embeddings]
    );
    return results.rows;
  }
}`
    },
    memory: {
      title: "🧠 Mémoire Hiérarchique Intelligente",
      description: "Système de compression mémoire avec résumés L1, L2, L3 et gestion de budget automatique.",
      code: `class HierarchicalMemoryManager {
  async addMessage(content: string, role: string, user: string): Promise<void> {
    const message: MemoryItem = {
      id: generateId(),
      type: 'raw',
      content,
      characterCount: content.length,
      speakerRole: role as 'user' | 'assistant',
      timestamp: new Date().toISOString(),
      metadata: { originalMessageCount: 1 }
    };
    
    this.memory.push(message);
    this.checkAndCreateL1(user);
    this.applyBudgetCompression(user);
  }
  
  private checkAndCreateL1(user: string): void {
    const messagesSinceLastL1 = this.getMessagesSinceLastL1();
    
    if (messagesSinceLastL1 >= 5) {
      console.log(\`📊 \${messagesSinceLastL1} messages depuis le dernier L1\`);
      this.createL1Summary(user);
    }
  }
  
  private async createL1Summary(user: string): Promise<void> {
    const rawMessages = this.getMessagesSinceLastL1();
    const summary = await this.summarizationAgent.createSummary(rawMessages);
    
    const l1Item: MemoryItem = {
      id: generateId(),
      type: 'summary',
      level: 1,
      content: summary.content,
      covers: rawMessages.map(m => m.id),
      characterCount: summary.content.length,
      timestamp: new Date().toISOString(),
      metadata: {
        originalMessageCount: rawMessages.length,
        compressionRatio: summary.content.length / rawMessages.reduce((acc, m) => acc + m.characterCount, 0)
      }
    };
    
    this.memory.push(l1Item);
    this.lastL1Timestamp = Date.now();
  }
}`
    },
    codeinsight: {
      title: "🔍 Code Insight & Regenerator Engine",
      description: "Système expérimental d'analyse intelligente et de régénération de code TypeScript avec compression mémoire et validation automatique.",
      code: `class FileRegeneratorV2 {
  async regenerateFile(compressedFile: CompressedFile): Promise<RegenerationResultV2> {
    const startTime = Date.now();
    console.log(\`🔄 Régénération V2 du fichier: \${compressedFile.metadata.fileName}\`);

    try {
      const regenerationResult = await this.generateTypeScriptCodeWithExplanations(compressedFile);
      const validation = await this.validateGeneratedCode(regenerationResult.code, compressedFile);
      
      const metadata = this.calculateRegenerationMetadata(compressedFile, regenerationResult.code, Date.now() - startTime);
      const success = validation.overallScore >= 70;
      
      console.log(\`✅ Régénération V2 terminée: \${success ? 'SUCCÈS' : 'ÉCHEC'}\`);
      console.log(\`   Score: \${validation.overallScore}/100\`);
      
      return {
        success,
        regeneratedCode: regenerationResult.code,
        explanations: regenerationResult.explanations,
        suggestions: regenerationResult.suggestions,
        validation,
        metadata,
        errors: this.extractErrors(validation),
        warnings: this.extractWarnings(validation)
      };
    } catch (error) {
      console.error(\`❌ Erreur régénération V2 fichier \${compressedFile.metadata.fileName}:\`, error);
      return this.createErrorResult(error);
    }
  }
  
  private async generateTypeScriptCodeWithExplanations(compressedFile: CompressedFile): Promise<RegenerationResult> {
    const regenerationPrompt = this.buildNaturalRegenerationPrompt(compressedFile);
    
    const response = await this.callLLM(regenerationPrompt);
    const result = this.parseIntelligentResponse(response);
    
    return {
      code: result.code.trim(),
      explanations: result.explanations,
      suggestions: result.suggestions
    };
  }
}`
    },
    xmlparser: {
      title: "🔍 LuciformXMLParser - Parser XML de Recherche",
      description: "Parser XML robuste avec récupération d'erreurs, sécurité anti-DoS/XXE et diagnostics précis.",
      code: `class LuciformXMLParser {
  private content: string;
  private diagnostics: Diagnostic[] = [];
  private maxDepth: number = 1000;
  private maxTextLength: number = 1024 * 1024;
  private entityExpansionLimit: number = 1000;
  private allowDTD: boolean = false;

  constructor(content: string, options: ParserOptions = {}) {
    this.content = content;
    this.maxDepth = options.maxDepth || 1000;
    this.maxTextLength = options.maxTextLength || 1024 * 1024;
    this.entityExpansionLimit = options.entityExpansionLimit || 1000;
    this.allowDTD = options.allowDTD || false;
  }

  parse(): ParseResult {
    const tokens = this.tokenize();
    const document = this.parseTokens(tokens);
    
    return {
      success: true,
      wellFormed: this.diagnostics.length === 0,
      recovered: this.diagnostics.length > 0,
      nodeCount: this.countNodes(document),
      document,
      diagnostics: this.diagnostics,
      errors: this.diagnostics.filter(d => d.level === 'error')
    };
  }

  private tokenize(): Token[] {
    const tokens: Token[] = [];
    let position = 0;
    let line = 1;
    let column = 1;

    while (position < this.content.length) {
      const char = this.content[position];
      
      if (char === '<') {
        const token = this.parseTag(position, line, column);
        tokens.push(token);
        position = token.location.position + token.content.length;
      } else {
        const textToken = this.parseText(position, line, column);
        if (textToken.content.trim()) {
          tokens.push(textToken);
        }
        position = textToken.location.position + textToken.content.length;
      }
      
      this.updatePosition(char, line, column);
    }

    return tokens;
  }

  private parseTag(position: number, line: number, column: number): Token {
    const startPos = position;
    let content = '';
    
    while (position < this.content.length) {
      content += this.content[position];
      if (this.content[position] === '>') {
        break;
      }
      position++;
    }

    const tagMatch = content.match(/^<(\/?)([^\s>]+)([^>]*?)(\/?)?>$/);
    if (!tagMatch) {
      this.addDiagnostic('error', 'INVALID_TAG', 
        'Tag malformé', { position, line, column });
    }

    return {
      type: tagMatch[1] ? 'EndTag' : 'StartTag',
      content,
      location: { position: startPos, line, column },
      tagName: tagMatch[2],
      selfClosing: !!tagMatch[4]
    };
  }
}`
    }
  };

  const generatePDF = async () => {
    setIsGenerating(true);
    
    try {
      // Sélectionner l'élément à convertir
      const element = document.getElementById('cv-content');
      if (!element) {
        throw new Error('Élément CV non trouvé');
      }
      
      // Convertir les images en base64 pour éviter les problèmes de CORS
      const convertImageToBase64 = async (src: string): Promise<string> => {
        try {
          const response = await fetch(src);
          const blob = await response.blob();
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } catch (error) {
          console.warn(`Impossible de convertir l'image ${src}:`, error);
          return src; // Retourner l'URL originale en cas d'erreur
        }
      };
      
      // Convertir les images importantes en base64
      const baseUrl = window.location.origin;
      const photoBase64 = await convertImageToBase64(`${baseUrl}/photos_lucie/photo2.jpg`);
      const logoBase64 = await convertImageToBase64(`${baseUrl}/pentagram_icon_transparent.png`);
      const albumBase64 = await convertImageToBase64(`${baseUrl}/Symbole macabre sur papier quadrillé - Fond album Egr3gorr.png`);
      
      // Remplacer les URLs par les base64
      const htmlWithBase64Images = element.outerHTML
        .replace(/src="\/photos_lucie\/photo2\.jpg"/g, `src="${photoBase64}"`)
        .replace(/src="\/pentagram_icon_transparent\.png"/g, `src="${logoBase64}"`)
        .replace(/src="\/Symbole macabre sur papier quadrillé - Fond album Egr3gorr\.png"/g, `src="${albumBase64}"`);
      
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>CV - Lucie Defraiteur</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: Arial, sans-serif;
              line-height: 1.5;
              color: #000000;
              background-color: #ffffff;
            }
            
            .cv-container {
              max-width: 800px;
              margin: 0 auto;
              padding: 30px;
            }
            
            .section {
              background-color: #f9f9f9;
              border-radius: 8px;
              padding: 20px;
              margin-bottom: 25px;
              page-break-inside: avoid;
            }
            
            .section-large {
              padding: 25px;
              margin-bottom: 30px;
            }
            
            h1 {
              font-size: 32px;
              font-weight: bold;
              color: #000000;
              margin-bottom: 20px;
            }
            
            h2 {
              font-size: 18px;
              color: #333333;
              margin-bottom: 15px;
            }
            
            h3 {
              font-size: 24px;
              font-weight: bold;
              color: #000000;
              margin-bottom: 15px;
              display: flex;
              align-items: center;
            }
            
            h4 {
              font-size: 18px;
              font-weight: 600;
              color: #000000;
              margin-bottom: 10px;
            }
            
            p {
              color: #333333;
              margin-bottom: 15px;
            }
            
            ul {
              color: #333333;
              padding-left: 20px;
              list-style: none;
            }
            
            li {
              margin-bottom: 8px;
              padding-left: 10px;
            }
            
            .header-section {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #ccc;
              padding-bottom: 20px;
            }
            
            .logo-title {
              display: flex;
              align-items: center;
              justify-content: center;
              margin-bottom: 20px;
            }
            
            .logo {
              width: 48px;
              height: 48px;
              margin-right: 15px;
            }
            
            .contact-box {
              background-color: #f0f0f0;
              border-radius: 8px;
              padding: 15px;
              display: inline-block;
            }
            
            .photo-section {
              text-align: center;
              margin-bottom: 30px;
            }
            
            .profile-photo {
              width: 200px;
              height: 250px;
              border-radius: 8px;
              object-fit: cover;
              border: 2px solid #ccc;
            }
            
            .tech-grid {
              display: flex;
              gap: 30px;
            }
            
            .tech-column {
              flex: 1;
            }
            
            .experience-item {
              border-left: 4px solid #8b5cf6;
              padding-left: 20px;
              margin-bottom: 20px;
            }
            
            .experience-item.blue {
              border-left-color: #3b82f6;
            }
            
            .experience-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 8px;
            }
            
            .experience-date {
              font-size: 14px;
              color: #666666;
              background-color: #f0f0f0;
              padding: 4px 12px;
              border-radius: 12px;
            }
            
            .company-name {
              font-size: 14px;
              color: #333333;
              margin-bottom: 8px;
              font-weight: 500;
            }
            
            .tech-tags {
              display: flex;
              flex-wrap: wrap;
              gap: 8px;
              margin-bottom: 10px;
            }
            
            .tech-tag {
              font-size: 12px;
              background-color: #f0f0f0;
              color: #333333;
              padding: 4px 8px;
              border-radius: 4px;
            }
            
            .video-item {
              background-color: #ffffff;
              border-radius: 8px;
              padding: 20px;
              border: 1px solid #ddd;
              margin-bottom: 20px;
            }
            
            .video-content {
              display: flex;
              gap: 20px;
            }
            
            .video-thumbnail {
              width: 160px;
              height: 90px;
              object-fit: cover;
              border-radius: 4px;
              border: 1px solid #ccc;
            }
            
            .video-info {
              flex: 1;
            }
            
            .video-title {
              font-size: 16px;
              font-weight: 600;
              color: #000000;
              margin-bottom: 5px;
            }
            
            .video-company {
              font-size: 12px;
              color: #666666;
              margin-bottom: 5px;
              font-weight: 500;
            }
            
            .video-description {
              color: #333333;
              font-size: 12px;
              margin-bottom: 10px;
            }
            
            .video-tech-tags {
              display: flex;
              flex-wrap: wrap;
              gap: 4px;
              margin-bottom: 10px;
            }
            
            .video-tech-tag {
              font-size: 10px;
              background-color: #f0f0f0;
              color: #333333;
              padding: 2px 6px;
              border-radius: 3px;
            }
            
            .video-links {
              display: flex;
              flex-direction: column;
              gap: 2px;
            }
            
            .video-link {
              color: #0066cc;
              font-weight: 500;
              text-decoration: none;
              font-size: 11px;
            }
            
            .video-meta {
              font-size: 9px;
              color: #888888;
            }
            
            .youtube-badge {
              font-size: 10px;
              background-color: #dc2626;
              color: #ffffff;
              padding: 2px 6px;
              border-radius: 3px;
              text-align: center;
              margin-top: 5px;
            }
            
            .code-block {
              background-color: #1a1a1a;
              border-radius: 8px;
              padding: 20px;
              margin-bottom: 20px;
            }
            
            .code-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 15px;
            }
            
            .code-label {
              font-size: 14px;
              color: #888888;
            }
            
            .code-badge {
              font-size: 12px;
              color: #888888;
              background-color: #333333;
              padding: 4px 8px;
              border-radius: 4px;
            }
            
            .code-content {
              color: #e0e0e0;
              font-size: 12px;
              white-space: pre-wrap;
              font-family: 'Courier New', monospace;
            }
            
            .project-grid {
              display: flex;
              gap: 20px;
            }
            
            .project-card {
              flex: 1;
              background-color: #ffffff;
              border-radius: 8px;
              padding: 20px;
              border: 1px solid #ddd;
            }
            
            .project-title {
              font-size: 16px;
              font-weight: 600;
              color: #000000;
              margin-bottom: 10px;
              display: flex;
              align-items: center;
            }
            
            .project-icon {
              font-size: 20px;
              margin-right: 8px;
            }
            
            .project-description {
              color: #333333;
              font-size: 12px;
              margin-bottom: 15px;
            }
            
            .project-tech-tags {
              display: flex;
              flex-wrap: wrap;
              gap: 4px;
              margin-bottom: 15px;
            }
            
            .project-tech-tag {
              font-size: 10px;
              background-color: #f0f0f0;
              color: #333333;
              padding: 2px 6px;
              border-radius: 3px;
            }
            
            .project-link {
              color: #0066cc;
              font-weight: 500;
              text-decoration: none;
              font-size: 11px;
            }
            
            .album-info {
              margin-bottom: 15px;
              padding: 10px;
              background-color: #f0f0f0;
              border-radius: 4px;
            }
            
            .album-content {
              display: flex;
              align-items: center;
              gap: 10px;
              margin-bottom: 5px;
            }
            
            .album-cover {
              width: 40px;
              height: 40px;
              object-fit: cover;
              border-radius: 4px;
              border: 1px solid #ccc;
            }
            
            .album-title {
              font-size: 12px;
              font-weight: 600;
              color: #000000;
            }
            
            .album-subtitle {
              font-size: 10px;
              color: #666666;
            }
            
            .contact-section {
              text-align: center;
              margin-top: 30px;
            }
            
            .contact-box-large {
              background-color: #f0f0f0;
              border-radius: 8px;
              padding: 20px;
              display: inline-block;
            }
            
            .contact-title {
              font-size: 20px;
              font-weight: bold;
              color: #000000;
              margin-bottom: 15px;
            }
            
            .contact-links {
              display: flex;
              flex-direction: column;
              gap: 8px;
            }
            
            .contact-link {
              color: #0066cc;
              font-weight: 500;
              text-decoration: none;
            }
            
            .section-icon {
              font-size: 28px;
              margin-right: 10px;
            }
            
            @media print {
              .section {
                page-break-inside: avoid;
              }
              
              .experience-item {
                page-break-inside: avoid;
              }
              
              .video-item {
                page-break-inside: avoid;
              }
              
              .project-card {
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          ${htmlWithBase64Images}
        </body>
        </html>
      `;
      
      // Appeler l'API Puppeteer
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          html: htmlContent,
          filename: `Lucie_Defraiteur_CV_${new Date().toISOString().split('T')[0]}.pdf`
        }),
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors de la génération du PDF');
      }
      
      // Télécharger le PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Lucie_Defraiteur_CV_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
      alert('Erreur lors de la génération du PDF. Veuillez réessayer.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Header avec bouton retour */}
      <div className="bg-gray-100 p-4 border-b">
        <div className="container mx-auto flex justify-between items-center">
          <Link 
            href="/cv"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Retour au CV interactif
          </Link>
          <button
            onClick={generatePDF}
            disabled={isGenerating}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              isGenerating
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isGenerating ? '⏳ Génération...' : '📄 Télécharger PDF'}
          </button>
        </div>
      </div>

      {/* Contenu CV optimisé pour PDF */}
      <div id="cv-content" style={{ 
        fontFamily: 'Arial, sans-serif', 
        lineHeight: '1.5',
        maxWidth: '800px',
        margin: '0 auto',
        padding: '30px',
        backgroundColor: '#ffffff',
        color: '#000000',
        overflow: 'visible'
      }}>
        
        {/* Header CV */}
        <div style={{ textAlign: 'center', marginBottom: '30px', borderBottom: '2px solid #ccc', paddingBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
            <img 
              src="/pentagram_icon_transparent.png" 
              alt="LR Hub" 
              style={{ width: '48px', height: '48px', marginRight: '15px' }}
              crossOrigin="anonymous"
            />
            <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#000000', margin: 0 }}>
              Lucie Defraiteur
            </h1>
          </div>
          <h2 style={{ fontSize: '18px', color: '#333333', marginBottom: '15px', margin: 0 }}>
            Generative AI Engineer & Full-Stack Developer
          </h2>
          <p style={{ fontSize: '16px', color: '#666666', marginBottom: '15px', margin: 0 }}>
            luciedefraiteur@gmail.com
          </p>
          <div style={{ backgroundColor: '#f0f0f0', borderRadius: '8px', padding: '15px', display: 'inline-block' }}>
            <p style={{ color: '#333333', fontSize: '14px', marginBottom: '8px', margin: 0 }}>
              📱 Portfolio & CV en ligne complet
            </p>
            <a 
              href="https://www.luciformresearch.com" 
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#0066cc', fontWeight: '500', textDecoration: 'none' }}
            >
              🌐 Luciform Research Hub
            </a>
          </div>
        </div>

        {/* Photo de profil */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <img
            src="/photos_lucie/photo2.jpg"
            alt="Lucie Defraiteur"
            style={{ 
              width: '200px', 
              height: '250px', 
              borderRadius: '8px', 
              objectFit: 'cover',
              border: '2px solid #ccc'
            }}
            crossOrigin="anonymous"
          />
        </div>

        {/* Contenu CV */}
        <div>
          
        {/* Profil */}
        <div style={{ backgroundColor: '#f9f9f9', borderRadius: '8px', padding: '20px', marginBottom: '25px', pageBreakInside: 'avoid' }}>
          <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: '#000000', marginBottom: '15px', margin: 0, display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '28px', marginRight: '10px' }}>🔮</span>
            Profil Professionnel
          </h3>
            <p style={{ color: '#333333', lineHeight: '1.6', marginBottom: '15px', margin: 0 }}>
              <strong>Fullstack & GenAI Engineer | DevOps | AI Orchestration | Open Source</strong>
            </p>
            <p style={{ color: '#333333', lineHeight: '1.6', marginBottom: '15px', margin: 0 }}>
              Engineer spécialisée en Fullstack & AI Orchestration (Next.js, RAG, LLMs, pgVector, DevOps). 
              Je conçois des systèmes multi-fournisseurs (OpenAI, Gemini, Anthropic, Ollama) et développe des outils 
              open-source pour accélérer la productivité des développeurs — y compris un chat multimodal accessible dans mon portfolio.
            </p>
            <p style={{ color: '#333333', lineHeight: '1.6', margin: 0 }}>
              Passionnée par l'agentique et l'innovation, je rends disponibles mes projets en open-source sur GitLab. 
              En parallèle, je développe un univers artistique personnel (metal/black metal expérimental).
            </p>
          </div>

          {/* Technologies */}
          <div style={{ backgroundColor: '#f9f9f9', borderRadius: '8px', padding: '25px', marginBottom: '30px', pageBreakInside: 'avoid' }}>
            <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: '#000000', marginBottom: '20px', margin: 0, display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: '28px', marginRight: '10px' }}>⚡</span>
              Technologies & Expertise
            </h3>
            <div style={{ display: 'flex', gap: '30px' }}>
              <div style={{ flex: 1 }}>
                <h4 style={{ fontSize: '18px', fontWeight: '600', color: '#000000', marginBottom: '15px', margin: 0 }}>🤖 Intelligence Artificielle</h4>
                <ul style={{ color: '#333333', paddingLeft: '20px', margin: 0, listStyle: 'none' }}>
                  <li style={{ marginBottom: '8px', paddingLeft: '10px' }}>• Google Generative AI (Gemini)</li>
                  <li style={{ marginBottom: '8px', paddingLeft: '10px' }}>• Agents conversationnels avec personnalité</li>
                  <li style={{ marginBottom: '8px', paddingLeft: '10px' }}>• Systèmes de mémoire hiérarchique</li>
                  <li style={{ marginBottom: '8px', paddingLeft: '10px' }}>• Recherche sémantique avancée</li>
                  <li style={{ marginBottom: '8px', paddingLeft: '10px' }}>• Orchestration d'agents multiples</li>
                </ul>
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ fontSize: '18px', fontWeight: '600', color: '#000000', marginBottom: '15px', margin: 0 }}>💻 Développement</h4>
                <ul style={{ color: '#333333', paddingLeft: '20px', margin: 0, listStyle: 'none' }}>
                  <li style={{ marginBottom: '8px', paddingLeft: '10px' }}>• TypeScript & JavaScript</li>
                  <li style={{ marginBottom: '8px', paddingLeft: '10px' }}>• React & Next.js</li>
                  <li style={{ marginBottom: '8px', paddingLeft: '10px' }}>• Python (expertise approfondie)</li>
                  <li style={{ marginBottom: '8px', paddingLeft: '10px' }}>• Three.js & WebGL</li>
                  <li style={{ marginBottom: '8px', paddingLeft: '10px' }}>• PostgreSQL & Drizzle ORM</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Projet Principal */}
          <div style={{ backgroundColor: '#f9f9f9', borderRadius: '8px', padding: '25px', marginBottom: '30px', pageBreakInside: 'avoid' }}>
            <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: '#000000', marginBottom: '20px', margin: 0, display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: '28px', marginRight: '10px' }}>⛧</span>
              Projet Phare : LR TchatAgent
            </h3>
            
            {/* Code sélectionné */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ marginBottom: '15px' }}>
                <h4 style={{ fontSize: '18px', fontWeight: '600', color: '#000000', marginBottom: '10px', margin: 0 }}>
                  🎭 Orchestrateur Divin (Luciole)
                </h4>
                <p style={{ color: '#333333', marginBottom: '15px', margin: 0 }}>
                  Système d'orchestration intelligent qui coordonne plusieurs agents spécialisés.
                </p>
              </div>
              
              <div style={{ backgroundColor: '#1a1a1a', borderRadius: '8px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <span style={{ fontSize: '14px', color: '#888888' }}>Code TypeScript</span>
                  <span style={{ fontSize: '12px', color: '#888888', backgroundColor: '#333333', padding: '4px 8px', borderRadius: '4px' }}>
                    Production
                  </span>
                </div>
                <pre style={{ color: '#e0e0e0', fontSize: '12px', margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'Courier New, monospace' }}>
                  <code>{codeBlocks.orchestrator.code}</code>
                </pre>
              </div>
            </div>
          </div>

          {/* Expérience Professionnelle */}
          <div style={{ backgroundColor: '#f9f9f9', borderRadius: '8px', padding: '20px', marginBottom: '25px', pageBreakInside: 'avoid', pageBreakBefore: 'auto' }}>
            <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: '#000000', marginBottom: '20px', margin: 0, display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: '28px', marginRight: '10px' }}>💼</span>
              Expérience Professionnelle
            </h3>
            
            <div style={{ marginBottom: '20px' }}>
              <div style={{ borderLeft: '4px solid #8b5cf6', paddingLeft: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <h4 style={{ fontSize: '18px', fontWeight: '600', color: '#000000', margin: 0 }}>DevOps & Growth Engineer</h4>
                  <span style={{ fontSize: '14px', color: '#666666', backgroundColor: '#f0f0f0', padding: '4px 12px', borderRadius: '12px' }}>Août 2025 - Auj.</span>
                </div>
                <p style={{ fontSize: '14px', color: '#333333', marginBottom: '8px', margin: 0, fontWeight: '500' }}>LuciformResearch</p>
                <p style={{ color: '#333333', fontSize: '14px', marginBottom: '12px', margin: 0 }}>
                  Développement d'outils DevOps et croissance pour l'écosystème LR Hub™. 
                  Orchestration d'agents IA, systèmes RAG, et infrastructure cloud.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {['Next.js', 'RAG', 'Docker', 'pgVector', 'Google GenAI', 'DrizzleORM'].map(tech => (
                    <span key={tech} style={{ fontSize: '12px', backgroundColor: '#f0f0f0', color: '#333333', padding: '4px 8px', borderRadius: '4px' }}>
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ borderLeft: '4px solid #3b82f6', paddingLeft: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <h4 style={{ fontSize: '18px', fontWeight: '600', color: '#000000', margin: 0 }}>3D/Tools Developer</h4>
                  <span style={{ fontSize: '14px', color: '#666666', backgroundColor: '#f0f0f0', padding: '4px 12px', borderRadius: '12px' }}>Févr. 2021 - Janv. 2024</span>
                </div>
                <p style={{ fontSize: '14px', color: '#333333', marginBottom: '8px', margin: 0, fontWeight: '500' }}>Designhubz, Verizon/Smartcom/Altersis</p>
                <p style={{ color: '#333333', fontSize: '14px', marginBottom: '12px', margin: 0 }}>
                  Développement d'outils 3D interactifs et optimisation front-end. 
                  Expertise en WebGL, Three.js, et applications 3D temps réel.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {['TypeScript', 'React.js', 'Three.js', 'WebGL', 'GLSL', 'C++'].map(tech => (
                    <span key={tech} style={{ fontSize: '12px', backgroundColor: '#f0f0f0', color: '#333333', padding: '4px 8px', borderRadius: '4px' }}>
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Démonstrations Vidéo */}
          <div style={{ backgroundColor: '#f9f9f9', borderRadius: '8px', padding: '25px', marginBottom: '30px', pageBreakInside: 'avoid', pageBreakBefore: 'auto' }}>
            <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: '#000000', marginBottom: '20px', margin: 0, display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: '28px', marginRight: '10px' }}>🎬</span>
              Démonstrations Vidéo de Mon Travail
            </h3>
            <p style={{ color: '#333333', marginBottom: '20px', margin: 0 }}>
              Collection de vidéos démontrant mes projets professionnels et personnels en développement 3D, moteurs de jeu et outils spécialisés.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {videos.slice(0, 4).map((video) => (
                <div key={video.id} style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '20px', border: '1px solid #ddd' }}>
                  <div style={{ display: 'flex', gap: '20px' }}>
                    <div style={{ flexShrink: 0 }}>
                      <img
                        src={video.thumbnail}
                        alt={`Preview de ${video.title}`}
                        style={{ 
                          width: '160px', 
                          height: '90px', 
                          objectFit: 'cover', 
                          borderRadius: '4px', 
                          border: '1px solid #ccc'
                        }}
                        crossOrigin="anonymous"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (target.src.includes('maxresdefault')) {
                            target.src = `https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`;
                          }
                        }}
                      />
                      <div style={{ textAlign: 'center', marginTop: '5px' }}>
                        <span style={{ fontSize: '10px', backgroundColor: '#dc2626', color: '#ffffff', padding: '2px 6px', borderRadius: '3px' }}>
                          YouTube
                        </span>
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#000000', marginBottom: '5px', margin: 0 }}>{video.title}</h4>
                      <p style={{ fontSize: '12px', color: '#666666', marginBottom: '5px', margin: 0, fontWeight: '500' }}>{video.company}</p>
                      <p style={{ color: '#333333', fontSize: '12px', marginBottom: '10px', margin: 0 }}>{video.description}</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '10px' }}>
                        {video.tech.split(', ').map(tech => (
                          <span key={tech} style={{ fontSize: '10px', backgroundColor: '#f0f0f0', color: '#333333', padding: '2px 6px', borderRadius: '3px' }}>
                            {tech}
                          </span>
                        ))}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <a
                          href={video.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#0066cc', fontWeight: '500', textDecoration: 'none', fontSize: '11px' }}
                        >
                          🎬 {video.url}
                        </a>
                        <p style={{ fontSize: '9px', color: '#888888', margin: 0 }}>
                          ID: {video.videoId} | {video.category}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stack Technique */}
          <div style={{ backgroundColor: '#f9f9f9', borderRadius: '8px', padding: '25px', marginBottom: '30px', pageBreakInside: 'avoid' }}>
            <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: '#000000', marginBottom: '20px', margin: 0, display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: '28px', marginRight: '10px' }}>🛠️</span>
              Stack Technique Complet
            </h3>
            <div style={{ display: 'flex', gap: '30px' }}>
              <div style={{ flex: 1 }}>
                <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#000000', marginBottom: '10px', margin: 0 }}>Frontend</h4>
                <ul style={{ color: '#333333', paddingLeft: '20px', margin: 0, listStyle: 'none' }}>
                  <li style={{ marginBottom: '5px', paddingLeft: '10px', fontSize: '12px' }}>• React 19 & Next.js 15</li>
                  <li style={{ marginBottom: '5px', paddingLeft: '10px', fontSize: '12px' }}>• TypeScript & Tailwind CSS</li>
                  <li style={{ marginBottom: '5px', paddingLeft: '10px', fontSize: '12px' }}>• Three.js & WebGL</li>
                  <li style={{ marginBottom: '5px', paddingLeft: '10px', fontSize: '12px' }}>• Systèmes de thèmes adaptatifs</li>
                  <li style={{ marginBottom: '5px', paddingLeft: '10px', fontSize: '12px' }}>• Animations CSS avancées</li>
                </ul>
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#000000', marginBottom: '10px', margin: 0 }}>Backend</h4>
                <ul style={{ color: '#333333', paddingLeft: '20px', margin: 0, listStyle: 'none' }}>
                  <li style={{ marginBottom: '5px', paddingLeft: '10px', fontSize: '12px' }}>• Node.js & Express</li>
                  <li style={{ marginBottom: '5px', paddingLeft: '10px', fontSize: '12px' }}>• PostgreSQL & Drizzle ORM</li>
                  <li style={{ marginBottom: '5px', paddingLeft: '10px', fontSize: '12px' }}>• JWT & OAuth2</li>
                  <li style={{ marginBottom: '5px', paddingLeft: '10px', fontSize: '12px' }}>• Chiffrement AES-256</li>
                  <li style={{ marginBottom: '5px', paddingLeft: '10px', fontSize: '12px' }}>• APIs RESTful</li>
                </ul>
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#000000', marginBottom: '10px', margin: 0 }}>IA & ML</h4>
                <ul style={{ color: '#333333', paddingLeft: '20px', margin: 0, listStyle: 'none' }}>
                  <li style={{ marginBottom: '5px', paddingLeft: '10px', fontSize: '12px' }}>• Google Generative AI</li>
                  <li style={{ marginBottom: '5px', paddingLeft: '10px', fontSize: '12px' }}>• Embeddings vectoriels</li>
                  <li style={{ marginBottom: '5px', paddingLeft: '10px', fontSize: '12px' }}>• Agents conversationnels</li>
                  <li style={{ marginBottom: '5px', paddingLeft: '10px', fontSize: '12px' }}>• Systèmes de mémoire</li>
                  <li style={{ marginBottom: '5px', paddingLeft: '10px', fontSize: '12px' }}>• Orchestration d'agents</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Projets Open Source */}
          <div style={{ backgroundColor: '#f9f9f9', borderRadius: '8px', padding: '25px', marginBottom: '30px', pageBreakInside: 'avoid' }}>
            <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: '#000000', marginBottom: '20px', margin: 0, display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: '28px', marginRight: '10px' }}>🦊</span>
              Projets Open Source
            </h3>
            <p style={{ color: '#333333', marginBottom: '20px', margin: 0 }}>
              Mes projets sont disponibles en open-source sur GitLab, démontrant mon engagement envers la communauté développeur.
            </p>
            
            <div style={{ display: 'flex', gap: '20px' }}>
              <div style={{ flex: 1, backgroundColor: '#ffffff', borderRadius: '8px', padding: '20px', border: '1px solid #ddd' }}>
                <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#000000', marginBottom: '10px', margin: 0, display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontSize: '20px', marginRight: '8px' }}>🚀</span>
                  LR Hub™
                </h4>
                <p style={{ color: '#333333', fontSize: '12px', marginBottom: '15px', margin: 0 }}>
                  Plateforme d'intelligence artificielle avancée avec agents conversationnels, 
                  mémoire hiérarchique et outils de développement.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '15px' }}>
                  {['Next.js', 'TypeScript', 'PostgreSQL', 'pgVector', 'Google GenAI', 'DrizzleORM'].map(tech => (
                    <span key={tech} style={{ fontSize: '10px', backgroundColor: '#f0f0f0', color: '#333333', padding: '2px 6px', borderRadius: '3px' }}>
                      {tech}
                    </span>
                  ))}
                </div>
                <a 
                  href="https://gitlab.com/luciformresearch/lr_chat" 
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#0066cc', fontWeight: '500', textDecoration: 'none', fontSize: '11px' }}
                >
                  🦊 https://gitlab.com/luciformresearch/lr_chat
                </a>
              </div>

              <div style={{ flex: 1, backgroundColor: '#ffffff', borderRadius: '8px', padding: '20px', border: '1px solid #ddd' }}>
                <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#000000', marginBottom: '10px', margin: 0, display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontSize: '20px', marginRight: '8px' }}>🎵</span>
                  Projets Artistiques
                </h4>
                <p style={{ color: '#333333', fontSize: '12px', marginBottom: '15px', margin: 0 }}>
                  En parallèle, je développe un univers artistique personnel 
                  (metal/black metal expérimental) et partage mes sessions de gaming.
                </p>
                
                <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                    <img
                      src="/Symbole macabre sur papier quadrillé - Fond album Egr3gorr.png"
                      alt="Symbole macabre - Album Egr3gorrr"
                      style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #ccc' }}
                      crossOrigin="anonymous"
                    />
                    <div>
                      <h5 style={{ fontSize: '12px', fontWeight: '600', color: '#000000', margin: 0 }}>Egr3gorrr</h5>
                      <p style={{ fontSize: '10px', color: '#666666', margin: 0 }}>Black Metal Expérimental</p>
                    </div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '15px' }}>
                  {['Musique', 'Production', 'Composition', 'Black Metal'].map(tech => (
                    <span key={tech} style={{ fontSize: '10px', backgroundColor: '#f0f0f0', color: '#333333', padding: '2px 6px', borderRadius: '3px' }}>
                      {tech}
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <a 
                    href="https://www.deezer.com/fr/artist/339068821" 
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#0066cc', fontWeight: '500', textDecoration: 'none', fontSize: '11px' }}
                  >
                    🎵 https://www.deezer.com/fr/artist/339068821
                  </a>
                  <a 
                    href="https://www.youtube.com/@luciethevampire" 
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#0066cc', fontWeight: '500', textDecoration: 'none', fontSize: '11px' }}
                  >
                    🎮 https://www.youtube.com/@luciethevampire
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div style={{ textAlign: 'center', marginTop: '30px' }}>
            <div style={{ backgroundColor: '#f0f0f0', borderRadius: '8px', padding: '20px', display: 'inline-block' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#000000', marginBottom: '15px', margin: 0 }}>📧 Contact</h3>
              <p style={{ color: '#333333', marginBottom: '15px', margin: 0 }}>luciedefraiteur@gmail.com</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <a 
                  href="https://www.luciformresearch.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#0066cc', fontWeight: '500', textDecoration: 'none' }}
                >
                  🌐 Portfolio: https://www.luciformresearch.com
                </a>
                <a 
                  href="https://gitlab.com/luciformresearch" 
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#0066cc', fontWeight: '500', textDecoration: 'none' }}
                >
                  🦊 Projets: https://gitlab.com/luciformresearch
                </a>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}