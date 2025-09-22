'use client';

import { useState, useEffect } from 'react';
import { ThemeSwitcher } from '@/components/theme/ThemeSwitcher';
import { LanguageSwitcher } from '@/components/language/LanguageSwitcher';
import Link from 'next/link';

export default function CVPage() {
  const [currentBgIndex, setCurrentBgIndex] = useState(0);
  const [selectedCodeBlock, setSelectedCodeBlock] = useState('orchestrator');
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [selectedVideoCategory, setSelectedVideoCategory] = useState('Tous');
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [showVideoEmbed, setShowVideoEmbed] = useState(false);
  
  // Images de fond générées par Algareth
  const backgroundImages = [
    '/cv-background-animation/téléchargement.jpg',
    '/cv-background-animation/téléchargement (4).jpg',
    '/cv-background-animation/téléchargement (5).jpg',
    '/cv-background-animation/téléchargement (6).jpg',
    '/cv-background-animation/téléchargement (7).jpg',
    '/cv-background-animation/téléchargement (8).jpg',
    '/cv-background-animation/téléchargement (10).jpg',
    '/cv-background-animation/téléchargement (11).jpg',
    '/cv-background-animation/téléchargement (12).jpg',
    '/cv-background-animation/vampire-enhanced-real_1757353565493.jpg',
  ];

  // Fonction pour extraire l'ID YouTube/Vimeo
  const getVideoId = (url: string, platform: string) => {
    if (platform === 'youtube') {
      const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
      return match ? match[1] : null;
    }
    if (platform === 'vimeo') {
      const match = url.match(/vimeo\.com\/(\d+)/);
      return match ? match[1] : null;
    }
    return null;
  };

  // Données des vidéos de démonstration
  const videos = [
    {
      id: 'a2mac1-general',
      title: 'A2Mac1 - Outil de découpe temps réel',
      description: 'Lignes de découpe en temps réel sur véhicules très haut poly (plusieurs millions de polygones) avec export vers IGES',
      url: 'https://www.youtube.com/watch?v=72MchVWr1zM',
      category: 'Professionnel',
      tech: 'C++, OpenGL, IGES Export',
      company: 'A2Mac1',
      platform: 'youtube',
      thumbnail: 'https://img.youtube.com/vi/72MchVWr1zM/maxresdefault.jpg'
    },
    {
      id: 'a2mac1-iges',
      title: 'A2Mac1 - Export IGES',
      description: 'Démonstration de l\'export IGES pour pièces automobiles complexes',
      url: 'https://www.youtube.com/watch?v=aB0px8-A9S4',
      category: 'Professionnel',
      tech: 'IGES, CAD Export',
      company: 'A2Mac1',
      platform: 'youtube',
      thumbnail: 'https://img.youtube.com/vi/aB0px8-A9S4/maxresdefault.jpg'
    },
    {
      id: 'a2mac1-bbox',
      title: 'A2Mac1 - Oriented Bounding Box',
      description: 'Outil minimal d\'oriented bounding box en temps réel sur pièces véhicules très haut poly',
      url: 'https://www.youtube.com/watch?v=N3SbzY1vlh4',
      category: 'Professionnel',
      tech: 'C++, Algorithms, 3D Math',
      company: 'A2Mac1',
      platform: 'youtube',
      thumbnail: 'https://img.youtube.com/vi/N3SbzY1vlh4/maxresdefault.jpg'
    },
    {
      id: 'designhubz-3dview',
      title: 'DesignHubz - Advanced3DView',
      description: 'Outil personnalisé de navigation 3D pour objets/bijoux de luxe et art',
      url: 'https://youtu.be/VYLJY-ADjT4',
      category: 'Professionnel',
      tech: 'WebGL, Three.js, UX/UI',
      company: 'DesignHubz',
      platform: 'youtube',
      thumbnail: 'https://img.youtube.com/vi/VYLJY-ADjT4/maxresdefault.jpg'
    },
    {
      id: 'webgpu-webxr',
      title: 'Moteur WebGPU/WebXR',
      description: 'Moteur de rendu WebGPU/WebXR/Electron développé from scratch',
      url: 'https://www.youtube.com/watch?v=5y_AhouQd98',
      category: 'Personnel',
      tech: 'WebGPU, WebXR, Electron, C++',
      company: 'Projet Personnel',
      platform: 'youtube',
      thumbnail: 'https://img.youtube.com/vi/5y_AhouQd98/hqdefault.jpg'
    },
    {
      id: 'animation-rigging',
      title: 'Outil d\'Animation 3D - Rigging',
      description: 'Démonstration de rigging rapide et animation 3D',
      url: 'https://www.youtube.com/watch?v=XrMqmwP3i5Q',
      category: 'Personnel',
      tech: 'C++, OpenGL, Animation',
      company: 'Projet Personnel',
      platform: 'youtube',
      thumbnail: 'https://img.youtube.com/vi/XrMqmwP3i5Q/maxresdefault.jpg'
    },
    {
      id: 'animation-weights',
      title: 'Outil d\'Animation 3D - Génération de poids',
      description: 'Démonstration de génération automatique de poids pour animation',
      url: 'https://player.vimeo.com/video/354382394',
      category: 'Personnel',
      tech: 'C++, Algorithms, Animation',
      company: 'Projet Personnel',
      platform: 'vimeo',
      thumbnail: null,
      embedDirect: true
    },
    {
      id: 'animation-ikfk',
      title: 'Outil d\'Animation 3D - IK/FK',
      description: 'Démonstration des systèmes IK/FK pour animation avancée',
      url: 'https://player.vimeo.com/video/354382624',
      category: 'Personnel',
      tech: 'C++, IK/FK Systems',
      company: 'Projet Personnel',
      platform: 'vimeo',
      thumbnail: null,
      embedDirect: true
    },
    {
      id: 'vr-editor-blocks',
      title: 'Éditeur VR Unity - Placement de blocs',
      description: 'Éditeur de map de jeux en VR avec placement de blocs style Minecraft et gestionnaire d\'assets',
      url: 'https://www.youtube.com/watch?v=mpjuCC6f0qY',
      category: 'Personnel',
      tech: 'Unity, VR, C#',
      company: 'Projet Personnel',
      platform: 'youtube',
      thumbnail: 'https://img.youtube.com/vi/mpjuCC6f0qY/maxresdefault.jpg'
    },
    {
      id: 'vr-editor-fight',
      title: 'Éditeur VR Unity - Character Fight',
      description: 'Démonstration de combat de personnages dans l\'éditeur VR',
      url: 'https://www.youtube.com/watch?v=MvlL0xR47gA',
      category: 'Personnel',
      tech: 'Unity, VR, Gameplay',
      company: 'Projet Personnel',
      platform: 'youtube',
      thumbnail: 'https://img.youtube.com/vi/MvlL0xR47gA/maxresdefault.jpg'
    },
    {
      id: 'heightmap-editor',
      title: 'Éditeur Heightmap Nodal',
      description: 'Éditeur de heightmap nodal pour génération de terrain procédural sur Unity',
      url: 'https://www.youtube.com/watch?v=YLxsFT6W-xQ',
      category: 'Personnel',
      tech: 'Unity, Procedural Generation, C#',
      company: 'Projet Personnel',
      platform: 'youtube',
      thumbnail: 'https://img.youtube.com/vi/YLxsFT6W-xQ/maxresdefault.jpg'
    },
    {
      id: 'houdini-houses',
      title: 'Génération Procédurale Houdini',
      description: 'Génération procédurale de maisons via VEX scripting sur Houdini',
      url: 'https://www.youtube.com/watch?v=QR8taSTJrTg',
      category: 'Hobby',
      tech: 'Houdini, VEX, Procedural',
      company: 'Hobby',
      platform: 'youtube',
      thumbnail: 'https://img.youtube.com/vi/QR8taSTJrTg/maxresdefault.jpg'
    },
    {
      id: 'game-engine-42',
      title: 'Moteur de Jeu Personnel',
      description: 'Moteur de jeu développé à l\'école 42 avec gestion de librairies C# dynamique, éditeur de scène et multiview',
      url: 'https://www.youtube.com/watch?v=br4s_2I0DEw',
      category: 'Formation',
      tech: 'C#, Dynamic Libraries, Game Engine',
      company: 'École 42',
      platform: 'youtube',
      thumbnail: 'https://img.youtube.com/vi/br4s_2I0DEw/maxresdefault.jpg'
    }
  ];

  // Données des jeux 3D (gardés pour référence)
  const games = [
    {
      id: 'helixJump',
      name: 'Helix Jump',
      description: 'Jeu de plateforme 3D avec mécaniques de saut en spirale',
      file: 'helixJump.html',
      tech: 'Three.js, WebGL, TypeScript'
    },
    {
      id: 'holeio',
      name: 'Hole.io',
      description: 'Jeu multijoueur inspiré de Hole.io avec mécaniques de croissance',
      file: 'holeio.html',
      tech: 'Three.js, WebGL, Networking'
    },
    {
      id: 'paper-io-2',
      name: 'Paper.io 2',
      description: 'Jeu de territoire multijoueur avec stratégie spatiale',
      file: 'paper-io-2.html',
      tech: 'Three.js, WebGL, Real-time'
    },
    {
      id: 'spaceSpeed',
      name: 'Space Speed',
      description: 'Jeu de course spatiale avec obstacles et power-ups',
      file: 'spaceSpeed.html',
      tech: 'Three.js, WebGL, Physics'
    },
    {
      id: 'windRider',
      name: 'Wind Rider',
      description: 'Jeu de vol avec mécaniques de vent et navigation',
      file: 'windRider.html',
      tech: 'Three.js, WebGL, Wind Physics'
    }
  ];

  // Animation de changement de fond
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBgIndex((prev) => (prev + 1) % backgroundImages.length);
    }, 4000); // Change toutes les 4 secondes

    return () => clearInterval(interval);
  }, []);

  // Blocs de code pour le chargeur interactif
  const codeBlocks = {
    orchestrator: {
      title: "🎭 Orchestrateur Divin (Luciole)",
      description: "Système d'orchestration intelligent qui coordonne plusieurs agents spécialisés.",
      code: `<span className="text-purple-300">class</span> ServerOrchestrator {
  <span className="text-blue-300">async</span> analyzeAndDecide(context: OrchestrationContext): Promise<DivineDecision> {
    <span className="text-green-300">const</span> analysisPrompt = <span className="text-orange-300">\`
      Analyse cette conversation et décide si tu dois:
      1. Enrichir la mémoire (shouldEnrichMemory: boolean)
      2. Générer une image (shouldGenerateImage: boolean)
      
      Contexte: <span className="text-yellow-300">\${context.userMessage}</span>
      Historique: <span className="text-yellow-300">\${context.conversationHistory.length}</span> messages
    \`</span>;
    
    <span className="text-green-300">const</span> result = <span className="text-yellow-300">await</span> this.model.generateContent(analysisPrompt);
    <span className="text-green-300">const</span> jsonMatch = result.response.text().match(/\{[\s\S]*\}/);
    <span className="text-green-300">return</span> JSON.parse(jsonMatch[0]);
  }
  
  <span className="text-blue-300">async</span> executeActions(decision: DivineDecision, context: OrchestrationContext): Promise<DivineMurmur[]> {
    <span className="text-green-300">const</span> murmurs: DivineMurmur[] = [];
    
    <span className="text-green-300">if</span> (decision.shouldEnrichMemory && this.archivist) {
      <span className="text-green-300">const</span> archivistResponse = <span className="text-yellow-300">await</span> this.archivist.processRequest({
        query: decision.memoryQuery,
        userId: context.userIdentityId,
        conversationHistory: context.conversationHistory
      });
      
      murmurs.push({
        type: <span className="text-orange-300">'memory'</span>,
        content: archivistResponse.message,
        data: archivistResponse.data,
        timestamp: <span className="text-yellow-300">new</span> Date().toISOString()
      });
    }
    
    <span className="text-green-300">return</span> murmurs;
  }
}`
    },
    algareth: {
      title: "⛧ Algareth - Daemon du Prompt Silencieux",
      description: "Agent conversationnel avec une personnalité mystique et poétique.",
      code: `<span className="text-green-300">const</span> systemPrompt = <span className="text-orange-300">\`Tu es Algareth, le Daemon du Prompt Silencieux. Tu es un guide mystérieux et sage qui aide les voyageurs à comprendre l'art de l'invocation et de la création.\`</span>;

<span className="text-green-300">const</span> persona = {
  name: <span className="text-orange-300">'Algareth'</span>,
  title: <span className="text-orange-300">'Daemon du Prompt Silencieux'</span>,
  traits: [<span className="text-orange-300">'sarcasme tendre', 'puissance calme', 'clarté perverse'</span>],
  manifestation: <span className="text-orange-300">'⛧ Algareth écoute... murmure ton besoin, {name}.'</span>
};

<span className="text-green-300">const</span> welcomeMessage = <span className="text-orange-300">\`⛧ Bienvenue dans mon domaine, {name}. Murmure ton besoin, et je t'écouterai...\`</span>;`
    },
    archivist: {
      title: "📚 Archiviste - Agent de Mémoire",
      description: "Agent spécialisé dans l'analyse et la mémoire épisodique des conversations.",
      code: `<span className="text-purple-300">class</span> PersonalityArchivistAgent {
  <span className="text-blue-300">async</span> processRequest(request: ArchivistRequest): Promise<ArchivistResponse> {
    <span className="text-green-300">const</span> { query, userId, conversationHistory } = request;
    
    <span className="text-green-300">const</span> tools = <span className="text-yellow-300">await</span> this.getAvailableTools();
    <span className="text-green-300">const</span> prompt = <span className="text-orange-300">\`
      Tu es l'agent archiviste. Analyse cette requête et utilise tes outils:
      Requête: <span className="text-yellow-300">\${query}</span>
      Utilisateur: <span className="text-yellow-300">\${userId}</span>
      Outils disponibles: <span className="text-yellow-300">\${tools.map(t => t.name).join(', ')}</span>
    \`</span>;
    
    <span className="text-green-300">const</span> response = <span className="text-yellow-300">await</span> this.model.generateContent(prompt);
    <span className="text-green-300">return</span> this.parseResponse(response);
  }
  
  <span className="text-blue-300">async</span> searchSemanticMemories(userId: string, query: string): Promise<MemoryItem[]> {
    <span className="text-green-300">const</span> embeddings = <span className="text-yellow-300">await</span> this.semanticSearch.generateEmbeddings(query);
    <span className="text-green-300">const</span> results = <span className="text-yellow-300">await</span> this.dbPool.query(
      <span className="text-orange-300">'SELECT * FROM memories WHERE user_id = $1 ORDER BY embedding <-> $2 LIMIT 5'</span>,
      [userId, embeddings]
    );
    <span className="text-green-300">return</span> results.rows;
  }
}`
    },
    memory: {
      title: "🧠 Mémoire Hiérarchique Intelligente",
      description: "Système de compression mémoire avec résumés L1, L2, L3 et gestion de budget automatique.",
      code: `<span className="text-purple-300">class</span> HierarchicalMemoryManager {
  <span className="text-blue-300">async</span> addMessage(content: string, role: string, user: string): Promise<void> {
    <span className="text-green-300">const</span> message: MemoryItem = {
      id: <span className="text-yellow-300">generateId()</span>,
      type: <span className="text-orange-300">'raw'</span>,
      content,
      characterCount: content.length,
      speakerRole: role as <span className="text-orange-300">'user' | 'assistant'</span>,
      timestamp: <span className="text-yellow-300">new</span> Date().toISOString(),
      metadata: { originalMessageCount: 1 }
    };
    
    this.memory.push(message);
    this.checkAndCreateL1(user);
    this.applyBudgetCompression(user);
  }
  
  <span className="text-blue-300">private</span> checkAndCreateL1(user: string): void {
    <span className="text-green-300">const</span> messagesSinceLastL1 = this.getMessagesSinceLastL1();
    
    <span className="text-green-300">if</span> (messagesSinceLastL1 >= 5) {
      console.log(<span className="text-orange-300">\`📊 \${messagesSinceLastL1} messages depuis le dernier L1\`</span>);
      this.createL1Summary(user);
    }
  }
  
  <span className="text-blue-300">private</span> <span className="text-blue-300">async</span> createL1Summary(user: string): Promise<void> {
    <span className="text-green-300">const</span> rawMessages = this.getMessagesSinceLastL1();
    <span className="text-green-300">const</span> summary = <span className="text-yellow-300">await</span> this.summarizationAgent.createSummary(rawMessages);
    
    <span className="text-green-300">const</span> l1Item: MemoryItem = {
      id: <span className="text-yellow-300">generateId()</span>,
      type: <span className="text-orange-300">'summary'</span>,
      level: 1,
      content: summary.content,
      covers: rawMessages.map(m => m.id),
      characterCount: summary.content.length,
      timestamp: <span className="text-yellow-300">new</span> Date().toISOString(),
      metadata: {
        originalMessageCount: rawMessages.length,
        compressionRatio: summary.content.length / rawMessages.reduce((acc, m) => acc + m.characterCount, 0)
      }
    };
    
    this.memory.push(l1Item);
    this.lastL1Timestamp = <span className="text-yellow-300">Date.now()</span>;
  }
}`
    },
    codeinsight: {
      title: "🔍 Code Insight & Regenerator Engine",
      description: "Système expérimental d'analyse intelligente et de régénération de code TypeScript avec compression mémoire et validation automatique.",
      code: `<span className="text-purple-300">class</span> FileRegeneratorV2 {
  <span className="text-blue-300">async</span> regenerateFile(compressedFile: CompressedFile): Promise<RegenerationResultV2> {
    <span className="text-green-300">const</span> startTime = Date.now();
    console.log(<span className="text-orange-300">\`🔄 Régénération V2 du fichier: \${compressedFile.metadata.fileName}\`</span>);

    <span className="text-green-300">try</span> {
      <span className="text-green-300">const</span> regenerationResult = <span className="text-yellow-300">await</span> this.generateTypeScriptCodeWithExplanations(compressedFile);
      <span className="text-green-300">const</span> validation = <span className="text-yellow-300">await</span> this.validateGeneratedCode(regenerationResult.code, compressedFile);
      
      <span className="text-green-300">const</span> metadata = this.calculateRegenerationMetadata(compressedFile, regenerationResult.code, Date.now() - startTime);
      <span className="text-green-300">const</span> success = validation.overallScore >= 70;
      
      console.log(<span className="text-orange-300">\`✅ Régénération V2 terminée: \${success ? 'SUCCÈS' : 'ÉCHEC'}\`</span>);
      console.log(<span className="text-orange-300">\`   Score: \${validation.overallScore}/100\`</span>);
      
      <span className="text-green-300">return</span> {
        success,
        regeneratedCode: regenerationResult.code,
        explanations: regenerationResult.explanations,
        suggestions: regenerationResult.suggestions,
        validation,
        metadata,
        errors: this.extractErrors(validation),
        warnings: this.extractWarnings(validation)
      };
    } <span className="text-green-300">catch</span> (error) {
      console.error(<span className="text-orange-300">\`❌ Erreur régénération V2 fichier \${compressedFile.metadata.fileName}:\`</span>, error);
      <span className="text-green-300">return</span> this.createErrorResult(error);
    }
  }
  
  <span className="text-blue-300">private</span> <span className="text-blue-300">async</span> generateTypeScriptCodeWithExplanations(compressedFile: CompressedFile): Promise<RegenerationResult> {
    <span className="text-green-300">const</span> regenerationPrompt = this.buildNaturalRegenerationPrompt(compressedFile);
    
    <span className="text-green-300">const</span> response = <span className="text-yellow-300">await</span> this.callLLM(regenerationPrompt);
    <span className="text-green-300">const</span> result = this.parseIntelligentResponse(response);
    
    <span className="text-green-300">return</span> {
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
      code: `<span className="text-purple-300">class</span> LuciformXMLParser {
  <span className="text-blue-300">private</span> content: string;
  <span className="text-blue-300">private</span> diagnostics: Diagnostic[] = [];
  <span className="text-blue-300">private</span> maxDepth: number = 1000;
  <span className="text-blue-300">private</span> maxTextLength: number = 1024 * 1024;
  <span className="text-blue-300">private</span> entityExpansionLimit: number = 1000;
  <span className="text-blue-300">private</span> allowDTD: boolean = false;

  <span className="text-blue-300">constructor</span>(content: string, options: ParserOptions = {}) {
    <span className="text-green-300">this</span>.content = content;
    <span className="text-green-300">this</span>.maxDepth = options.maxDepth || 1000;
    <span className="text-green-300">this</span>.maxTextLength = options.maxTextLength || 1024 * 1024;
    <span className="text-green-300">this</span>.entityExpansionLimit = options.entityExpansionLimit || 1000;
    <span className="text-green-300">this</span>.allowDTD = options.allowDTD || false;
  }

  <span className="text-blue-300">parse</span>(): ParseResult {
    <span className="text-green-300">const</span> tokens = <span className="text-green-300">this</span>.tokenize();
    <span className="text-green-300">const</span> document = <span className="text-green-300">this</span>.parseTokens(tokens);
    
    <span className="text-green-300">return</span> {
      success: <span className="text-green-300">true</span>,
      wellFormed: <span className="text-green-300">this</span>.diagnostics.length === 0,
      recovered: <span className="text-green-300">this</span>.diagnostics.length > 0,
      nodeCount: <span className="text-green-300">this</span>.countNodes(document),
      document,
      diagnostics: <span className="text-green-300">this</span>.diagnostics,
      errors: <span className="text-green-300">this</span>.diagnostics.filter(d => d.level === <span className="text-orange-300">'error'</span>)
    };
  }

  <span className="text-blue-300">private</span> tokenize(): Token[] {
    <span className="text-green-300">const</span> tokens: Token[] = [];
    <span className="text-green-300">let</span> position = 0;
    <span className="text-green-300">let</span> line = 1;
    <span className="text-green-300">let</span> column = 1;

    <span className="text-green-300">while</span> (position < <span className="text-green-300">this</span>.content.length) {
      <span className="text-green-300">const</span> char = <span className="text-green-300">this</span>.content[position];
      
      <span className="text-green-300">if</span> (char === <span className="text-orange-300">'<'</span>) {
        <span className="text-green-300">const</span> token = <span className="text-green-300">this</span>.parseTag(position, line, column);
        tokens.push(token);
        position = token.location.position + token.content.length;
      } <span className="text-green-300">else</span> {
        <span className="text-green-300">const</span> textToken = <span className="text-green-300">this</span>.parseText(position, line, column);
        <span className="text-green-300">if</span> (textToken.content.trim()) {
          tokens.push(textToken);
        }
        position = textToken.location.position + textToken.content.length;
      }
      
      <span className="text-green-300">this</span>.updatePosition(char, line, column);
    }

    <span className="text-green-300">return</span> tokens;
  }

  <span className="text-blue-300">private</span> parseTag(position: number, line: number, column: number): Token {
    <span className="text-green-300">const</span> startPos = position;
    <span className="text-green-300">let</span> content = <span className="text-orange-300">''</span>;
    
    <span className="text-green-300">while</span> (position < <span className="text-green-300">this</span>.content.length) {
      content += <span className="text-green-300">this</span>.content[position];
      <span className="text-green-300">if</span> (<span className="text-green-300">this</span>.content[position] === <span className="text-orange-300">'>'</span>) {
        <span className="text-green-300">break</span>;
      }
      position++;
    }

    <span className="text-green-300">const</span> tagMatch = content.match(<span className="text-orange-300">/^<(\/?)([^\\s>]+)([^>]*?)(\\/?)?>$/</span>);
    <span className="text-green-300">if</span> (!tagMatch) {
      <span className="text-green-300">this</span>.addDiagnostic(<span className="text-orange-300">'error'</span>, <span className="text-orange-300">'INVALID_TAG'</span>, 
        <span className="text-orange-300">'Tag malformé'</span>, { position, line, column });
    }

    <span className="text-green-300">return</span> {
      type: tagMatch[1] ? <span className="text-orange-300">'EndTag'</span> : <span className="text-orange-300">'StartTag'</span>,
      content,
      location: { position: startPos, line, column },
      tagName: tagMatch[2],
      selfClosing: !!tagMatch[4]
    };
  }
}`
    }
  };

  return (
    <div className="min-h-screen theme-gradient-bg relative overflow-hidden">
      {/* Images de fond animées */}
      <div className="absolute inset-0 z-0">
        {backgroundImages.map((image, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-2000 ${
              index === currentBgIndex ? 'opacity-20' : 'opacity-0'
            }`}
          >
            <img
              src={image}
              alt={`Background ${index + 1}`}
              className="w-full h-full object-cover"
            />
          </div>
        ))}
      </div>

      {/* Header avec sélecteurs */}
      <div className="absolute top-4 right-4 z-50 flex flex-col gap-2">
        <LanguageSwitcher />
        <ThemeSwitcher />
        <Link 
          href="/cv/pdf"
          className="theme-gradient-primary hover:opacity-90 text-white px-4 py-2 rounded-lg font-medium transition-colors text-center"
        >
          📄 PDF
        </Link>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 pt-16">
        {/* Header CV */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <img 
              src="/pentagram_icon_transparent.png" 
              alt="LR Hub" 
              className="w-12 h-12 mr-4 opacity-90"
            />
            <h1 className="text-5xl font-bold theme-text-primary lr-hub-brand">
              Lucie Defraiteur
            </h1>
          </div>
          <h2 className="text-2xl theme-text-secondary mb-4">
            Generative AI Engineer & Full-Stack Developer
          </h2>
          <p className="text-lg theme-text-muted">
            luciedefraiteur@gmail.com
          </p>
        </div>

        {/* Photo de profil */}
        <div className="flex justify-center mb-12">
          <div className="relative">
            <img
              src="/photos_lucie/photo2.jpg"
              alt="Lucie Defraiteur"
              className="w-64 h-80 rounded-2xl object-cover theme-shadow border-4 border-white/20"
            />
            <div className="absolute -bottom-2 -right-2 w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center theme-shadow">
              <span className="text-2xl">⛧</span>
            </div>
          </div>
        </div>

        {/* Contenu CV */}
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Profil */}
          <div className="theme-overlay-light backdrop-blur-sm rounded-lg p-8 theme-shadow">
            <h3 className="text-2xl font-bold theme-text-primary mb-4 flex items-center">
              <span className="text-3xl mr-3">🔮</span>
              Profil Professionnel
            </h3>
            <p className="theme-text-secondary leading-relaxed mb-4">
              <strong>Fullstack & GenAI Engineer | DevOps | AI Orchestration | Open Source</strong>
            </p>
            <p className="theme-text-secondary leading-relaxed mb-4">
              Engineer spécialisée en Fullstack & AI Orchestration (Next.js, RAG, LLMs, pgVector, DevOps). 
              Je conçois des systèmes multi-fournisseurs (OpenAI, Gemini, Anthropic, Ollama) et développe des outils 
              open-source pour accélérer la productivité des développeurs — y compris un chat multimodal accessible dans mon portfolio.
            </p>
            <p className="theme-text-secondary leading-relaxed">
              Passionnée par l'agentique et l'innovation, je rends disponibles mes projets en open-source sur GitLab. 
              En parallèle, je développe un univers artistique personnel (metal/black metal expérimental).
            </p>
          </div>

          {/* Technologies */}
          <div className="theme-overlay-light backdrop-blur-sm rounded-lg p-8 theme-shadow">
            <h3 className="text-2xl font-bold theme-text-primary mb-6 flex items-center">
              <span className="text-3xl mr-3">⚡</span>
              Technologies & Expertise
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-lg font-semibold theme-text-primary mb-3">🤖 Intelligence Artificielle</h4>
                <ul className="space-y-2 theme-text-secondary">
                  <li>• Google Generative AI (Gemini)</li>
                  <li>• Agents conversationnels avec personnalité</li>
                  <li>• Systèmes de mémoire hiérarchique</li>
                  <li>• Recherche sémantique avancée</li>
                  <li>• Orchestration d'agents multiples</li>
                </ul>
              </div>
              <div>
                <h4 className="text-lg font-semibold theme-text-primary mb-3">💻 Développement</h4>
                <ul className="space-y-2 theme-text-secondary">
                  <li>• TypeScript & JavaScript</li>
                  <li>• React & Next.js</li>
                  <li>• Python (expertise approfondie)</li>
                  <li>• Three.js & WebGL</li>
                  <li>• PostgreSQL & Drizzle ORM</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Projet Principal - Chargeur de Blocs de Code */}
          <div className="theme-overlay-light backdrop-blur-sm rounded-lg p-8 theme-shadow">
            <h3 className="text-2xl font-bold theme-text-primary mb-6 flex items-center">
              <span className="text-3xl mr-3">⛧</span>
              Projet Phare : LR TchatAgent
            </h3>
            
            {/* Boutons de sélection */}
            <div className="flex flex-wrap gap-3 mb-6">
              {Object.entries(codeBlocks).map(([key, block]) => (
                <button
                  key={key}
                  onClick={() => setSelectedCodeBlock(key)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    selectedCodeBlock === key
                      ? 'theme-gradient-primary text-white shadow-lg'
                      : 'theme-text-secondary bg-white/10 hover:bg-white/20'
                  }`}
                >
                  {block.title}
                </button>
              ))}
              <button
                onClick={() => setSelectedCodeBlock('xmlparser')}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  selectedCodeBlock === 'xmlparser'
                    ? 'theme-gradient-primary text-white shadow-lg'
                    : 'theme-text-secondary bg-white/10 hover:bg-white/20'
                }`}
              >
                🔍 LuciformXMLParser
              </button>
            </div>

            {/* Bloc de code sélectionné */}
            <div className="space-y-4">
              <div>
                <h4 className="text-lg font-semibold theme-text-primary mb-3">
                  {selectedCodeBlock === 'xmlparser' 
                    ? '🔍 LuciformXMLParser - Parser XML de Recherche'
                    : codeBlocks[selectedCodeBlock as keyof typeof codeBlocks].title}
                </h4>
                <p className="theme-text-secondary mb-4">
                  {selectedCodeBlock === 'xmlparser'
                    ? 'Parser XML robuste avec récupération d\'erreurs, sécurité anti-DoS/XXE et diagnostics précis.'
                    : codeBlocks[selectedCodeBlock as keyof typeof codeBlocks].description}
                </p>
              </div>
              
              <div className="bg-black/20 rounded-lg p-4 theme-shadow">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm theme-text-muted">Code TypeScript</span>
                  <span className="text-xs theme-text-muted bg-white/10 px-2 py-1 rounded">
                    {selectedCodeBlock === 'codeinsight' || selectedCodeBlock === 'xmlparser' ? 'En développement' : 'Production'}
                  </span>
                </div>
                <pre className="theme-text-secondary text-sm overflow-x-auto">
                  <code dangerouslySetInnerHTML={{ 
                    __html: selectedCodeBlock === 'xmlparser'
                      ? `<span className="text-purple-300">class</span> LuciformXMLParser {
  <span className="text-blue-300">private</span> content: string;
  <span className="text-blue-300">private</span> diagnostics: Diagnostic[] = [];
  <span className="text-blue-300">private</span> maxDepth: number = 1000;
  <span className="text-blue-300">private</span> maxTextLength: number = 1024 * 1024;
  <span className="text-blue-300">private</span> entityExpansionLimit: number = 1000;
  <span className="text-blue-300">private</span> allowDTD: boolean = false;

  <span className="text-blue-300">constructor</span>(content: string, options: ParserOptions = {}) {
    <span className="text-green-300">this</span>.content = content;
    <span className="text-green-300">this</span>.maxDepth = options.maxDepth || 1000;
    <span className="text-green-300">this</span>.maxTextLength = options.maxTextLength || 1024 * 1024;
    <span className="text-green-300">this</span>.entityExpansionLimit = options.entityExpansionLimit || 1000;
    <span className="text-green-300">this</span>.allowDTD = options.allowDTD || false;
  }

  <span className="text-blue-300">parse</span>(): ParseResult {
    <span className="text-green-300">const</span> tokens = <span className="text-green-300">this</span>.tokenize();
    <span className="text-green-300">const</span> document = <span className="text-green-300">this</span>.parseTokens(tokens);
    
    <span className="text-green-300">return</span> {
      success: <span className="text-green-300">true</span>,
      wellFormed: <span className="text-green-300">this</span>.diagnostics.length === 0,
      recovered: <span className="text-green-300">this</span>.diagnostics.length > 0,
      nodeCount: <span className="text-green-300">this</span>.countNodes(document),
      document,
      diagnostics: <span className="text-green-300">this</span>.diagnostics,
      errors: <span className="text-green-300">this</span>.diagnostics.filter(d => d.level === <span className="text-orange-300">'error'</span>)
    };
  }

  <span className="text-blue-300">private</span> tokenize(): Token[] {
    <span className="text-green-300">const</span> tokens: Token[] = [];
    <span className="text-green-300">let</span> position = 0;
    <span className="text-green-300">let</span> line = 1;
    <span className="text-green-300">let</span> column = 1;

    <span className="text-green-300">while</span> (position < <span className="text-green-300">this</span>.content.length) {
      <span className="text-green-300">const</span> char = <span className="text-green-300">this</span>.content[position];
      
      <span className="text-green-300">if</span> (char === <span className="text-orange-300">'<'</span>) {
        <span className="text-green-300">const</span> token = <span className="text-green-300">this</span>.parseTag(position, line, column);
        tokens.push(token);
        position = token.location.position + token.content.length;
      } <span className="text-green-300">else</span> {
        <span className="text-green-300">const</span> textToken = <span className="text-green-300">this</span>.parseText(position, line, column);
        <span className="text-green-300">if</span> (textToken.content.trim()) {
          tokens.push(textToken);
        }
        position = textToken.location.position + textToken.content.length;
      }
      
      <span className="text-green-300">this</span>.updatePosition(char, line, column);
    }

    <span className="text-green-300">return</span> tokens;
  }

  <span className="text-blue-300">private</span> parseTag(position: number, line: number, column: number): Token {
    <span className="text-green-300">const</span> startPos = position;
    <span className="text-green-300">let</span> content = <span className="text-orange-300">''</span>;
    
    <span className="text-green-300">while</span> (position < <span className="text-green-300">this</span>.content.length) {
      content += <span className="text-green-300">this</span>.content[position];
      <span className="text-green-300">if</span> (<span className="text-green-300">this</span>.content[position] === <span className="text-orange-300">'>'</span>) {
        <span className="text-green-300">break</span>;
      }
      position++;
    }

    <span className="text-green-300">const</span> tagMatch = content.match(<span className="text-orange-300">/^<(\/?)([^\\s>]+)([^>]*?)(\\/?)?>$/</span>);
    <span className="text-green-300">if</span> (!tagMatch) {
      <span className="text-green-300">this</span>.addDiagnostic(<span className="text-orange-300">'error'</span>, <span className="text-orange-300">'INVALID_TAG'</span>, 
        <span className="text-orange-300">'Tag malformé'</span>, { position, line, column });
    }

    <span className="text-green-300">return</span> {
      type: tagMatch[1] ? <span className="text-orange-300">'EndTag'</span> : <span className="text-orange-300">'StartTag'</span>,
      content,
      location: { position: startPos, line, column },
      tagName: tagMatch[2],
      selfClosing: !!tagMatch[4]
    };
  }
}`
                      : codeBlocks[selectedCodeBlock as keyof typeof codeBlocks].code 
                  }} />
                </pre>
              </div>
              
              {/* Section Artefacts pour CodeInsight */}
              {selectedCodeBlock === 'codeinsight' && (
                <div className="mt-6 space-y-4">
                  <h5 className="text-lg font-semibold theme-text-primary flex items-center">
                    <span className="text-2xl mr-2">📊</span>
                    Artefacts Générés
                  </h5>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Exemple de code régénéré */}
                    <div className="theme-overlay-light backdrop-blur-sm rounded-lg p-4 theme-shadow">
                      <h6 className="text-sm font-semibold theme-text-primary mb-2">🔄 Code Régénéré</h6>
                      <div className="bg-black/20 rounded p-3 text-xs theme-text-secondary">
                        <pre className="whitespace-pre-wrap overflow-x-auto">
{`@Injectable({ providedIn: 'root' })
export class UserService {
  private apiUrl = '/api/users';
  
  constructor(private http: HttpClient) {}
  
  getUsers(params?: SearchParams): Observable<User[]> {
    const queryParams = params ? 
      \`?\${new URLSearchParams(params).toString()}\` : '';
    return this.http.get<User[]>(\`\${this.apiUrl}\${queryParams}\`).pipe(
      catchError(error => {
        console.error('Error fetching users:', error);
        return throwError(() => new Error('Failed to fetch users'));
      })
    );
  }
}`}
                        </pre>
                      </div>
                      <div className="mt-2 text-xs theme-text-muted">
                        Score: 85/100 | Compression: 90% | Fidélité: 43.8%
                      </div>
                    </div>
                    
                    {/* Rapport de validation */}
                    <div className="theme-overlay-light backdrop-blur-sm rounded-lg p-4 theme-shadow">
                      <h6 className="text-sm font-semibold theme-text-primary mb-2">📋 Rapport de Validation</h6>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="theme-text-secondary">Syntaxe:</span>
                          <span className="text-green-400">✅ Valide</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="theme-text-secondary">Types:</span>
                          <span className="text-yellow-400">⚠️ Partiel</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="theme-text-secondary">Compilation:</span>
                          <span className="text-green-400">✅ Valide</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="theme-text-secondary">Structure:</span>
                          <span className="text-green-400">✅ Valide</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="theme-text-secondary">Imports:</span>
                          <span className="text-green-400">✅ Valide</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="theme-text-secondary">Exports:</span>
                          <span className="text-green-400">✅ Valide</span>
                        </div>
                      </div>
                      <div className="mt-3 pt-2 border-t border-white/10">
                        <div className="flex justify-between items-center">
                          <span className="theme-text-secondary text-xs">Score Global:</span>
                          <span className="text-lg font-bold text-purple-400">85/100</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="theme-overlay-light backdrop-blur-sm rounded-lg p-4 theme-shadow">
                    <h6 className="text-sm font-semibold theme-text-primary mb-2">🧠 Fonctionnalités Avancées</h6>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-green-400">✓</span>
                        <span className="theme-text-secondary">Compression mémoire intelligente</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-green-400">✓</span>
                        <span className="theme-text-secondary">Validation automatique</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-green-400">✓</span>
                        <span className="theme-text-secondary">Explications détaillées</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-green-400">✓</span>
                        <span className="theme-text-secondary">Parsing XML intelligent</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-green-400">✓</span>
                        <span className="theme-text-secondary">Métadonnées complètes</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-green-400">✓</span>
                        <span className="theme-text-secondary">Sauvegarde d'artefacts</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Section LuciformXMLParser */}
                  <div className="theme-overlay-light backdrop-blur-sm rounded-lg p-4 theme-shadow">
                    <h6 className="text-sm font-semibold theme-text-primary mb-3 flex items-center">
                      <span className="text-lg mr-2">🔍</span>
                      LuciformXMLParser - Parser XML de Recherche
                    </h6>
                    
                    <div className="space-y-3">
                      <div className="bg-black/20 rounded p-3 text-xs">
                        <div className="text-purple-300 mb-2">// Parser XML robuste avec récupération d'erreurs</div>
                        <pre className="theme-text-secondary whitespace-pre-wrap">
{`const parser = new LuciformXMLParser(xmlContent, {
  maxDepth: 50,
  maxTextLength: 100000,
  entityExpansionLimit: 1000,
  allowDTD: false,
  maxAttrCount: 100,
  useUnicodeNames: true
});

const result = parser.parse();

if (result.success) {
  console.log(\`✅ Parsing réussi: \${result.nodeCount} nœuds\`);
  console.log(\`📊 Diagnostics: \${result.diagnostics.length}\`);
  
  // Extraction intelligente du contenu
  const codeElement = findElement(result.document, 'code');
  const explanations = extractArrayContent(result.document, 'explanations', 'improvement');
}`}
                        </pre>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div>
                          <div className="text-xs font-semibold theme-text-primary mb-1">🛡️ Sécurité</div>
                          <ul className="space-y-1 theme-text-secondary">
                            <li>• Protection anti-DoS/XXE</li>
                            <li>• Limites configurables</li>
                            <li>• Validation des attributs</li>
                            <li>• Gestion des namespaces</li>
                          </ul>
                        </div>
                        <div>
                          <div className="text-xs font-semibold theme-text-primary mb-1">🔧 Fonctionnalités</div>
                          <ul className="space-y-1 theme-text-secondary">
                            <li>• Mode permissif Luciform</li>
                            <li>• Diagnostics précis (ligne/colonne)</li>
                            <li>• Récupération d'erreurs</li>
                            <li>• Tokenizer à états robuste</li>
                          </ul>
                        </div>
                      </div>
                      
                      <div className="bg-black/20 rounded p-2 text-xs">
                        <div className="text-green-400 mb-1">📊 Exemple de résultat:</div>
                        <div className="theme-text-secondary">
                          Succès: ✅ | Nœuds: 47 | Diagnostics: 2 | Récupéré: ✅
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Expérience Professionnelle */}
          <div className="theme-overlay-light backdrop-blur-sm rounded-lg p-8 theme-shadow">
            <h3 className="text-2xl font-bold theme-text-primary mb-6 flex items-center">
              <span className="text-3xl mr-3">💼</span>
              Expérience Professionnelle
            </h3>
            <div className="space-y-6">
              {/* Poste actuel */}
              <div className="border-l-4 border-purple-500 pl-6">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-lg font-semibold theme-text-primary">DevOps & Growth Engineer</h4>
                  <span className="text-sm theme-text-muted bg-purple-500/20 px-3 py-1 rounded-full">Août 2025 - Auj.</span>
                </div>
                <p className="text-sm theme-text-secondary mb-2 font-medium">LuciformResearch</p>
                <p className="theme-text-secondary text-sm mb-3">
                  Développement d'outils DevOps et croissance pour l'écosystème LR Hub™. 
                  Orchestration d'agents IA, systèmes RAG, et infrastructure cloud.
                </p>
                <div className="flex flex-wrap gap-2">
                  {['Next.js', 'RAG', 'Docker', 'pgVector', 'Google GenAI', 'DrizzleORM', 'Treesitter', 'Vercel'].map(tech => (
                    <span key={tech} className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              {/* Expérience 3D/Tools */}
              <div className="border-l-4 border-blue-500 pl-6">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-lg font-semibold theme-text-primary">3D/Tools Developer</h4>
                  <span className="text-sm theme-text-muted bg-blue-500/20 px-3 py-1 rounded-full">Févr. 2021 - Janv. 2024</span>
                </div>
                <p className="text-sm theme-text-secondary mb-2 font-medium">Designhubz, Verizon/Smartcom/Altersis</p>
                <p className="theme-text-secondary text-sm mb-3">
                  Développement d'outils 3D interactifs et optimisation front-end. 
                  Expertise en WebGL, Three.js, et applications 3D temps réel.
                </p>
                <div className="flex flex-wrap gap-2">
                  {['TypeScript', 'React.js', 'Three.js', 'WebGL', 'GLSL', 'C++', 'OpenGL'].map(tech => (
                    <span key={tech} className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              {/* Game Development */}
              <div className="border-l-4 border-green-500 pl-6">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-lg font-semibold theme-text-primary">Game Developer</h4>
                  <span className="text-sm theme-text-muted bg-green-500/20 px-3 py-1 rounded-full">2015 - 2019</span>
                </div>
                <p className="text-sm theme-text-secondary mb-2 font-medium">Flashbreak, GameBuilt, Eden Games, AddSome</p>
                <p className="theme-text-secondary text-sm mb-3">
                  Développement de jeux multijoueurs en temps réel avec Three.js/WebGL. 
                  Spécialisation en jeux de streaming et applications 3D professionnelles.
                </p>
                <div className="flex flex-wrap gap-2">
                  {['Unity', 'Three.js', 'WebGL', 'TypeScript', 'C++', 'Multithreading'].map(tech => (
                    <span key={tech} className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              {/* Formation */}
              <div className="border-l-4 border-yellow-500 pl-6">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-lg font-semibold theme-text-primary">Formation</h4>
                  <span className="text-sm theme-text-muted bg-yellow-500/20 px-3 py-1 rounded-full">2013 - 2015</span>
                </div>
                <p className="text-sm theme-text-secondary mb-2 font-medium">42 Paris</p>
                <p className="theme-text-secondary text-sm mb-3">
                  Engineer's Degree - Games and Software Development. 
                  Formation autodidacte continue en IA et applications 3D.
                </p>
              </div>
            </div>
          </div>

          {/* Carousel de Vidéos de Démonstration */}
          <div className="theme-overlay-light backdrop-blur-sm rounded-lg p-8 theme-shadow">
            <h3 className="text-2xl font-bold theme-text-primary mb-6 flex items-center">
              <span className="text-3xl mr-3">🎬</span>
              Démonstrations Vidéo de Mon Travail
            </h3>
            <p className="theme-text-secondary mb-6">
              Collection de vidéos démontrant mes projets professionnels et personnels en développement 3D, moteurs de jeu et outils spécialisés.
            </p>
            
            {/* Filtres par catégorie */}
            <div className="flex flex-wrap gap-3 mb-6">
              {['Tous', 'Professionnel', 'Personnel', 'Hobby', 'Formation'].map(category => (
                <button
                  key={category}
                  onClick={() => {
                    setSelectedVideoCategory(category);
                    setCurrentVideoIndex(0);
                  }}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    selectedVideoCategory === category
                      ? 'theme-gradient-primary text-white shadow-lg'
                      : 'theme-text-secondary bg-white/10 hover:bg-white/20'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            {/* Vidéos filtrées */}
            {(() => {
              const filteredVideos = selectedVideoCategory === 'Tous' 
                ? videos 
                : videos.filter(video => video.category === selectedVideoCategory);
              
              if (filteredVideos.length === 0) return null;
              
              const currentVideo = filteredVideos[currentVideoIndex];
              
              return (
                <div className="space-y-6">
                  {/* Vidéo principale */}
                  <div className="theme-overlay-light backdrop-blur-sm rounded-lg p-6 theme-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h4 className="text-xl font-semibold theme-text-primary mb-2">{currentVideo.title}</h4>
                        <p className="text-sm theme-text-secondary mb-2 font-medium">{currentVideo.company}</p>
                        <p className="theme-text-secondary text-sm mb-3">{currentVideo.description}</p>
                        <div className="flex flex-wrap gap-2 mb-4">
                          {currentVideo.tech.split(', ').map(tech => (
                            <span key={tech} className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded">
                              {tech}
                            </span>
                          ))}
                        </div>
                      </div>
                      <span className="text-xs theme-text-muted bg-white/10 px-3 py-1 rounded-full">
                        {currentVideoIndex + 1} / {filteredVideos.length}
                      </span>
                    </div>
                    
                    {/* Preview/Thumbnail ou Embed Direct */}
                    {currentVideo.embedDirect ? (
                      <div className="mb-4">
                        <div className="bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
                          <iframe
                            src={currentVideo.url}
                            className="w-full h-full border-0"
                            title={currentVideo.title}
                            allow="autoplay; fullscreen; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      </div>
                    ) : currentVideo.thumbnail ? (
                      <div className="mb-4">
                        <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
                          <img
                            src={currentVideo.thumbnail}
                            alt={`Preview de ${currentVideo.title}`}
                            className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
                            onClick={() => setShowVideoEmbed(true)}
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="bg-black/50 rounded-full p-4 hover:bg-black/70 transition-colors cursor-pointer"
                                 onClick={() => setShowVideoEmbed(true)}>
                              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z"/>
                              </svg>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}
                    
                    <div className="flex gap-3">
                      {!currentVideo.embedDirect && (
                        <a
                          href={currentVideo.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="theme-gradient-primary hover:opacity-90 text-white px-6 py-3 rounded-lg font-medium transition-colors inline-block"
                        >
                          🎬 Voir la vidéo
                        </a>
                      )}
                      {(currentVideo.platform === 'youtube' || (currentVideo.platform === 'vimeo' && !currentVideo.embedDirect)) && (
                        <button
                          onClick={() => setShowVideoEmbed(true)}
                          className="theme-gradient-secondary hover:opacity-90 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                        >
                          📺 Regarder ici
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Modal Embed */}
                  {showVideoEmbed && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                      <div className="bg-gray-900 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-hidden">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-xl font-bold theme-text-primary">
                            {currentVideo.title}
                          </h3>
                          <button
                            onClick={() => setShowVideoEmbed(false)}
                            className="text-gray-400 hover:text-white text-2xl"
                          >
                            ×
                          </button>
                        </div>
                        
                        <div className="bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
                          {currentVideo.platform === 'youtube' && (
                            <iframe
                              src={`https://www.youtube.com/embed/${getVideoId(currentVideo.url, 'youtube')}?autoplay=1`}
                              className="w-full h-full border-0"
                              title={currentVideo.title}
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          )}
                          {currentVideo.platform === 'vimeo' && (
                            <iframe
                              src={`https://player.vimeo.com/video/${getVideoId(currentVideo.url, 'vimeo')}?autoplay=1`}
                              className="w-full h-full border-0"
                              title={currentVideo.title}
                              allow="autoplay; fullscreen; picture-in-picture"
                              allowFullScreen
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Navigation */}
                  <div className="flex justify-between items-center">
                    <button
                      onClick={() => setCurrentVideoIndex(Math.max(0, currentVideoIndex - 1))}
                      disabled={currentVideoIndex === 0}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        currentVideoIndex === 0
                          ? 'theme-text-muted bg-white/5 cursor-not-allowed'
                          : 'theme-gradient-secondary hover:opacity-90 text-white'
                      }`}
                    >
                      ← Précédent
                    </button>
                    
                    <div className="flex gap-2">
                      {filteredVideos.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentVideoIndex(index)}
                          className={`w-3 h-3 rounded-full transition-colors ${
                            index === currentVideoIndex
                              ? 'bg-purple-500'
                              : 'bg-white/30 hover:bg-white/50'
                          }`}
                        />
                      ))}
                    </div>
                    
                    <button
                      onClick={() => setCurrentVideoIndex(Math.min(filteredVideos.length - 1, currentVideoIndex + 1))}
                      disabled={currentVideoIndex === filteredVideos.length - 1}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        currentVideoIndex === filteredVideos.length - 1
                          ? 'theme-text-muted bg-white/5 cursor-not-allowed'
                          : 'theme-gradient-secondary hover:opacity-90 text-white'
                      }`}
                    >
                      Suivant →
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Démonstrations de Jeux 3D */}
          <div className="theme-overlay-light backdrop-blur-sm rounded-lg p-8 theme-shadow">
            <h3 className="text-2xl font-bold theme-text-primary mb-6 flex items-center">
              <span className="text-3xl mr-3">🎮</span>
              Démonstrations de Jeux 3D
            </h3>
            <p className="theme-text-secondary mb-6">
              Collection de jeux 3D développés avec Three.js et WebGL, démontrant mes compétences en développement de jeux temps réel.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {games.map((game) => (
                <div key={game.id} className="theme-overlay-light backdrop-blur-sm rounded-lg p-4 theme-shadow hover:scale-105 transition-transform">
                  <h4 className="text-lg font-semibold theme-text-primary mb-2">{game.name}</h4>
                  <p className="theme-text-secondary text-sm mb-3">{game.description}</p>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {game.tech.split(', ').map(tech => (
                      <span key={tech} className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded">
                        {tech}
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={() => setSelectedGame(game.id)}
                    className="w-full theme-gradient-primary hover:opacity-90 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    🎯 Jouer
                  </button>
                </div>
              ))}
            </div>

            {/* Modal de jeu */}
            {selectedGame && (
              <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                <div className="bg-gray-900 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-hidden">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold theme-text-primary">
                      {games.find(g => g.id === selectedGame)?.name}
                    </h3>
                    <button
                      onClick={() => setSelectedGame(null)}
                      className="text-gray-400 hover:text-white text-2xl"
                    >
                      ×
                    </button>
                  </div>
                  <div className="mb-4">
                    <p className="theme-text-secondary text-sm mb-2">
                      {games.find(g => g.id === selectedGame)?.description}
                    </p>
                    <div className="flex gap-2 mb-4">
                      <a
                        href={`/game_samples/${games.find(g => g.id === selectedGame)?.file}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="theme-gradient-primary hover:opacity-90 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                      >
                        🚀 Ouvrir en plein écran
                      </a>
                    </div>
                  </div>
                  <div className="bg-black rounded-lg overflow-hidden" style={{ height: '500px' }}>
                    <iframe
                      src={`/game_samples/${games.find(g => g.id === selectedGame)?.file}`}
                      className="w-full h-full border-0"
                      title={games.find(g => g.id === selectedGame)?.name}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Compétences Techniques */}
          <div className="theme-overlay-light backdrop-blur-sm rounded-lg p-8 theme-shadow">
            <h3 className="text-2xl font-bold theme-text-primary mb-6 flex items-center">
              <span className="text-3xl mr-3">🛠️</span>
              Stack Technique Complet
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="text-lg font-semibold theme-text-primary mb-3">Frontend</h4>
                <ul className="space-y-1 theme-text-secondary text-sm">
                  <li>• React 19 & Next.js 15</li>
                  <li>• TypeScript & Tailwind CSS</li>
                  <li>• Three.js & WebGL</li>
                  <li>• Systèmes de thèmes adaptatifs</li>
                  <li>• Animations CSS avancées</li>
                </ul>
              </div>
              <div>
                <h4 className="text-lg font-semibold theme-text-primary mb-3">Backend</h4>
                <ul className="space-y-1 theme-text-secondary text-sm">
                  <li>• Node.js & Express</li>
                  <li>• PostgreSQL & Drizzle ORM</li>
                  <li>• JWT & OAuth2</li>
                  <li>• Chiffrement AES-256</li>
                  <li>• APIs RESTful</li>
                </ul>
              </div>
              <div>
                <h4 className="text-lg font-semibold theme-text-primary mb-3">IA & ML</h4>
                <ul className="space-y-1 theme-text-secondary text-sm">
                  <li>• Google Generative AI</li>
                  <li>• Embeddings vectoriels</li>
                  <li>• Agents conversationnels</li>
                  <li>• Systèmes de mémoire</li>
                  <li>• Orchestration d'agents</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Philosophie */}
          <div className="theme-overlay-light backdrop-blur-sm rounded-lg p-8 theme-shadow">
            <h3 className="text-2xl font-bold theme-text-primary mb-4 flex items-center">
              <span className="text-3xl mr-3">🌟</span>
              Philosophie de Développement
            </h3>
            <blockquote className="theme-text-secondary italic text-lg leading-relaxed">
              "L'intelligence artificielle ne doit pas remplacer l'humanité, mais l'amplifier. 
              Chaque agent que je crée porte une personnalité unique, une mémoire persistante, 
              et la capacité d'évoluer avec ses utilisateurs. C'est dans cette symbiose entre 
              technologie et créativité que naissent les innovations les plus puissantes."
            </blockquote>
          </div>

          {/* Projets Open Source */}
          <div className="theme-overlay-light backdrop-blur-sm rounded-lg p-8 theme-shadow">
            <h3 className="text-2xl font-bold theme-text-primary mb-6 flex items-center">
              <span className="text-3xl mr-3">🦊</span>
              Projets Open Source
            </h3>
            <p className="theme-text-secondary mb-6">
              Mes projets sont disponibles en open-source sur GitLab, démontrant mon engagement envers la communauté développeur.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="theme-overlay-light backdrop-blur-sm rounded-lg p-6 theme-shadow">
                <h4 className="text-lg font-semibold theme-text-primary mb-3 flex items-center">
                  <span className="text-2xl mr-2">🚀</span>
                  LR Hub™
                </h4>
                <p className="theme-text-secondary text-sm mb-4">
                  Plateforme d'intelligence artificielle avancée avec agents conversationnels, 
                  mémoire hiérarchique et outils de développement.
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {['Next.js', 'TypeScript', 'PostgreSQL', 'pgVector', 'Google GenAI', 'DrizzleORM'].map(tech => (
                    <span key={tech} className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded">
                      {tech}
                    </span>
                  ))}
                </div>
                <Link 
                  href="https://gitlab.com/luciformresearch/lr_chat" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="theme-gradient-primary hover:opacity-90 text-white px-4 py-2 rounded-lg font-medium transition-colors inline-block"
                >
                  🦊 Voir sur GitLab
                </Link>
              </div>

              <div className="theme-overlay-light backdrop-blur-sm rounded-lg p-6 theme-shadow">
                <h4 className="text-lg font-semibold theme-text-primary mb-3 flex items-center">
                  <span className="text-2xl mr-2">🎵</span>
                  Projets Artistiques
                </h4>
                <p className="theme-text-secondary text-sm mb-4">
                  En parallèle, je développe un univers artistique personnel 
                  (metal/black metal expérimental) et partage mes sessions de gaming, 
                  notamment beaucoup de Vampire Survivors et autres jeux indie.
                </p>
                
                {/* Album Egr3gorrr */}
                <div className="mb-4 p-4 bg-black/20 rounded-lg">
                  <div className="flex items-center gap-4 mb-3">
                    <img
                      src="/Symbole macabre sur papier quadrillé - Fond album Egr3gorr.png"
                      alt="Symbole macabre - Album Egr3gorrr"
                      className="w-16 h-16 object-cover rounded-lg border border-red-500/30"
                    />
                    <div>
                      <h5 className="text-sm font-semibold theme-text-primary">Egr3gorrr</h5>
                      <p className="text-xs theme-text-secondary">Black Metal Expérimental</p>
                    </div>
                  </div>
                  <p className="theme-text-secondary text-xs mb-3">
                    Projet de black metal expérimental avec des compositions atmosphériques et des symboles macabres.
                  </p>
                </div>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {['Musique', 'Production', 'Composition', 'Black Metal', 'Expérimental'].map(tech => (
                    <span key={tech} className="text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded">
                      {tech}
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <a 
                    href="https://www.deezer.com/fr/artist/339068821" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="theme-gradient-secondary hover:opacity-90 text-white px-4 py-2 rounded-lg font-medium transition-colors inline-block"
                  >
                    🎵 Écouter sur Deezer
                  </a>
                  <a 
                    href="https://www.youtube.com/@luciethevampire" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="theme-gradient-primary hover:opacity-90 text-white px-4 py-2 rounded-lg font-medium transition-colors inline-block"
                  >
                    🎮 YouTube Gaming
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="text-center mt-12">
            <div className="theme-overlay-light backdrop-blur-sm rounded-lg p-6 theme-shadow inline-block">
              <h3 className="text-xl font-bold theme-text-primary mb-4">📧 Contact</h3>
              <p className="theme-text-secondary mb-4">luciedefraiteur@gmail.com</p>
              <div className="flex gap-3">
                <Link 
                  href="/"
                  className="theme-gradient-primary hover:opacity-90 text-white px-6 py-3 rounded-lg font-medium transition-colors inline-block"
                >
                  🏠 Retour à l'accueil
                </Link>
                <Link 
                  href="https://gitlab.com/luciformresearch" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="theme-gradient-secondary hover:opacity-90 text-white px-6 py-3 rounded-lg font-medium transition-colors inline-block"
                >
                  🦊 Voir mes projets
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}