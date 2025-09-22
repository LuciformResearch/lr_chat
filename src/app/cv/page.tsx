'use client';

import { useState, useEffect } from 'react';
import { ThemeSwitcher } from '@/components/theme/ThemeSwitcher';
import { LanguageSwitcher } from '@/components/language/LanguageSwitcher';
import Link from 'next/link';

export default function CVPage() {
  const [currentBgIndex, setCurrentBgIndex] = useState(0);
  const [selectedCodeBlock, setSelectedCodeBlock] = useState('orchestrator');
  
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
      code: `<span className="text-purple-300">class</span> Luciole {
  <span className="text-blue-300">async</span> analyzeAndDecide(context: OrchestrationContext) {
    <span className="text-green-300">const</span> analysisPrompt = <span className="text-orange-300">\`Tu es la Luciole, la compagne bienveillante d'Algareth...\`</span>;
    <span className="text-green-300">const</span> decision = <span className="text-yellow-300">await</span> this.model.generateContent(analysisPrompt);
    <span className="text-green-300">return</span> JSON.parse(decision.response.text());
  }
  
  <span className="text-blue-300">async</span> executeActions(decision: DivineDecision) {
    <span className="text-green-300">const</span> murmurs: DivineMurmur[] = [];
    <span className="text-green-300">if</span> (decision.shouldEnrichMemory && this.archivist) {
      <span className="text-green-300">const</span> archivistResponse = <span className="text-yellow-300">await</span> this.archivist.processRequest(decision.memoryQuery);
      murmurs.push({ type: 'memory', content: archivistResponse.message });
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
      code: `<span className="text-purple-300">class</span> ArchivistAgent {
  <span className="text-blue-300">async</span> analyzeConversation(context: any) {
    <span className="text-green-300">const</span> prompt = <span className="text-orange-300">\`Tu es l'Archiviste d'Algareth. Analyse cette conversation et fournis un rapport détaillé...\`</span>;
    <span className="text-green-300">const</span> result = <span className="text-yellow-300">await</span> this.model.generateContent(prompt);
    <span className="text-green-300">const</span> analysis = JSON.parse(result.response.text());
    
    <span className="text-green-300">return</span> \`📊 ANALYSE TERMINÉE:
📝 Résumé: \${analysis.summary}
🏷️ Topics: \${analysis.keyTopics.join(', ')}
😊 Humeur: \${analysis.userMood}
⭐ Performance Algareth: \${analysis.algarethPerformance}\`;
  }
  
  <span className="text-blue-300">async</span> searchMemory(userId: string, query: string) {
    <span className="text-green-300">const</span> relevantMemories = <span className="text-yellow-300">await</span> this.dbService.searchUserMemories(userId, query);
    <span className="text-green-300">return</span> relevantMemories;
  }
}`
    },
    codeinsight: {
      title: "🔍 Code Insight Engine",
      description: "Système d'analyse de code TypeScript en cours de développement.",
      code: `<span className="text-purple-300">class</span> CodeInsightEngine {
  <span className="text-blue-300">async</span> analyzeProject(projectPath: string) {
    <span className="text-green-300">const</span> files = <span className="text-yellow-300">await</span> this.findTypeScriptFiles(projectPath);
    <span className="text-green-300">const</span> fileReports: FileReport[] = [];
    
    <span className="text-green-300">for</span> (<span className="text-green-300">const</span> file <span className="text-green-300">of</span> files) {
      <span className="text-green-300">const</span> report = <span className="text-yellow-300">await</span> this.analyzeFile(file);
      fileReports.push(report);
    }
    
    <span className="text-green-300">const</span> summary = <span className="text-yellow-300">await</span> this.generateProjectSummary(fileReports);
    <span className="text-green-300">return</span> { projectPath, files: fileReports, summary };
  }
  
  <span className="text-blue-300">async</span> generateMarkdownReport(projectPath: string) {
    <span className="text-green-300">const</span> projectReport = <span className="text-yellow-300">await</span> this.analyzeProject(projectPath);
    <span className="text-green-300">return</span> this.formatAsMarkdown(projectReport);
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
            <p className="theme-text-secondary leading-relaxed">
              Développeuse passionnée par l'intelligence artificielle générative et les technologies émergentes. 
              Spécialisée dans la création d'agents IA sophistiqués avec des personnalités complexes et des systèmes 
              de mémoire hiérarchique. Expérience approfondie en développement full-stack avec une expertise particulière 
              en TypeScript, React, et Python.
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
            </div>

            {/* Bloc de code sélectionné */}
            <div className="space-y-4">
              <div>
                <h4 className="text-lg font-semibold theme-text-primary mb-3">
                  {codeBlocks[selectedCodeBlock as keyof typeof codeBlocks].title}
                </h4>
                <p className="theme-text-secondary mb-4">
                  {codeBlocks[selectedCodeBlock as keyof typeof codeBlocks].description}
                </p>
              </div>
              
              <div className="bg-black/20 rounded-lg p-4 theme-shadow">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm theme-text-muted">Code TypeScript</span>
                  <span className="text-xs theme-text-muted bg-white/10 px-2 py-1 rounded">
                    {selectedCodeBlock === 'codeinsight' ? 'En développement' : 'Production'}
                  </span>
                </div>
                <pre className="theme-text-secondary text-sm overflow-x-auto">
                  <code dangerouslySetInnerHTML={{ 
                    __html: codeBlocks[selectedCodeBlock as keyof typeof codeBlocks].code 
                  }} />
                </pre>
              </div>
            </div>
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