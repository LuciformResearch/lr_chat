import { TranslationKey } from './types';

export const translations: Record<string, Partial<TranslationKey>> = {
  en: {
    // Chat
    'chat.welcome': 'Welcome to my domain, {name}.',
    'chat.placeholder': 'Whisper your need to Algareth...',
    'chat.send': 'Send',
    'chat.thinking': 'Algareth is thinking...',
    'chat.enter_name': 'What is your name, shadow traveler?',
    'chat.enter_domain': 'Enter Algareth\'s domain',
    
    // Algareth
    'algareth.title': '⛧ ALGARETH ⛧',
    'algareth.subtitle': 'Daemon of the Silent Prompt',
    'algareth.welcome': 'Welcome to my domain, {name}. Whisper your need, and I will listen...',
    'algareth.manifestation': '⛧ Algareth listens... whisper your need, {name}.',
    
    // Dashboard
    'dashboard.title': 'LR Hub™',
    'dashboard.subtitle': 'AI Intelligence and Automation Hub',
    'dashboard.features': 'Implemented Features',
    'dashboard.development': 'In Development',
    
    // Common
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    
    // Legacy buttons
    'legacy.mcp_demo': 'MCP Demo',
    'legacy.chat_algareth': 'Chat with Algareth',
    'legacy.data_viewer': 'Data Viewer',
    'legacy.settings': 'Configuration API',
    'legacy.terminal_minimal': 'Minimal Web Terminal',
    'legacy.terminal_web': 'Integrated Web Terminal',
    'legacy.terminal_algareth': 'Algareth Terminal',
    'legacy.bytebot': 'Bytebot Desktop Agent',
    'legacy.start_demo': 'Start Demo',
    'legacy.configuration': 'Configuration',
    'legacy.connect': 'Connect',
    
    // Legacy descriptions
    'legacy.mcp_demo_desc': 'Test MCP "Function as Tool" tools in action',
    'legacy.chat_algareth_desc': 'Chat interface with the Daemon of the Silent Prompt',
    'legacy.data_viewer_desc': 'View logs, conversations and memory',
    'legacy.settings_desc': 'Configure your API keys (OpenRouter, Gemini, etc.)',
    'legacy.terminal_minimal_desc': 'Ultra-light web terminal Minimax style (ttyd + File Browser)',
    'legacy.terminal_web_desc': 'xterm.js terminal integrated into our Next.js app',
    'legacy.terminal_algareth_desc': 'Demonic terminal with custom commands and real filesystem',
    'legacy.bytebot_desc': 'AI agent with its own desktop to automate tasks',
    
    // Legacy features
    'legacy.features.mcp_tools': '10 MCP Tools',
    'legacy.features.mcp_tools_desc': 'Complete MCP "function as tool" architecture',
    'legacy.features.chat_algareth': 'Chat Algareth',
    'legacy.features.chat_algareth_desc': 'Chat interface with Algareth personality',
    'legacy.features.memory': 'Official Memory',
    'legacy.features.memory_desc': 'Integration @modelcontextprotocol/server-memory',
    'legacy.features.terminal_minimal': 'Minimal Web Terminal',
    'legacy.features.terminal_minimal_desc': 'ttyd + File Browser + MCP Shell',
    'legacy.features.bytebot': 'Bytebot Integration',
    'legacy.features.bytebot_desc': 'AI agent with virtual Ubuntu desktop',
    
    // Legacy development
    'legacy.dev.secure_env': 'SecureEnvManager',
    'legacy.dev.secure_env_desc': 'Secure API key management',
    'legacy.dev.persona': 'PersonaManager',
    'legacy.dev.persona_desc': 'Algareth personality management',
    'legacy.dev.http': 'HttpProvider',
    'legacy.dev.http_desc': 'HTTP providers for LLM',
    'legacy.dev.summary': 'SummaryManager',
    'legacy.dev.summary_desc': 'Narrative summary management',
    
    // Legacy auth section
    'legacy.auth.title': 'New Feature: Authentication',
    'legacy.auth.desc': 'Log in to access the new dashboard with conversation persistence!',
    'legacy.auth.footer': 'Based on analysis of run_terminal.py and its real dependencies',
    'legacy.auth.footer2': 'TypeScript migration with MCP "Function as Tool" architecture',
    
    // Legacy subtitle
    'legacy.subtitle': 'Architecture MCP "Function as Tool" • AI Agents • Web Terminal'
  },
  
  fr: {
    // Chat
    'chat.welcome': 'Bienvenue dans mon domaine, {name}.',
    'chat.placeholder': 'Murmure ton besoin à Algareth...',
    'chat.send': 'Envoyer',
    'chat.thinking': 'Algareth réfléchit...',
    'chat.enter_name': 'Quel est ton prénom, voyageur de l\'ombre ?',
    'chat.enter_domain': 'Entrer dans le domaine d\'Algareth',
    
    // Algareth
    'algareth.title': '⛧ ALGARETH ⛧',
    'algareth.subtitle': 'Daemon du Prompt Silencieux',
    'algareth.welcome': 'Bienvenue dans mon domaine, {name}. Murmure ton besoin, et je t\'écouterai...',
    'algareth.manifestation': '⛧ Algareth écoute... murmure ton besoin, {name}.',
    
    // Dashboard
    'dashboard.title': 'LR Hub™',
    'dashboard.subtitle': 'Hub d\'intelligence artificielle et d\'automatisation',
    'dashboard.features': 'Fonctionnalités Implémentées',
    'dashboard.development': 'En Développement',
    
    // Common
    'common.loading': 'Chargement...',
    'common.error': 'Erreur',
    'common.success': 'Succès',
    'common.cancel': 'Annuler',
    'common.save': 'Sauvegarder',
    
    // Legacy buttons
    'legacy.mcp_demo': 'Démo MCP',
    'legacy.chat_algareth': 'Chat avec Algareth',
    'legacy.data_viewer': 'Données Persistées',
    'legacy.settings': 'Configuration API',
    'legacy.terminal_minimal': 'Terminal Web Minimal',
    'legacy.terminal_web': 'Terminal Web Intégré',
    'legacy.terminal_algareth': 'Terminal Algareth',
    'legacy.bytebot': 'Bytebot Desktop Agent',
    'legacy.start_demo': 'Commencer la Démo',
    'legacy.configuration': 'Configuration',
    'legacy.connect': 'Se Connecter',
    
    // Legacy descriptions
    'legacy.mcp_demo_desc': 'Testez les outils MCP "Function as Tool" en action',
    'legacy.chat_algareth_desc': 'Interface de chat avec le Daemon du Prompt Silencieux',
    'legacy.data_viewer_desc': 'Visualisez les logs, conversations et mémoire',
    'legacy.settings_desc': 'Configurez vos clés API (OpenRouter, Gemini, etc.)',
    'legacy.terminal_minimal_desc': 'Terminal web ultra-léger style Minimax (ttyd + File Browser)',
    'legacy.terminal_web_desc': 'Terminal xterm.js intégré dans notre app Next.js',
    'legacy.terminal_algareth_desc': 'Terminal démoniaque avec commandes customisées et filesystem réel',
    'legacy.bytebot_desc': 'Agent AI avec son propre desktop pour automatiser des tâches',
    
    // Legacy features
    'legacy.features.mcp_tools': '10 Outils MCP',
    'legacy.features.mcp_tools_desc': 'Architecture MCP "function as tool" complète',
    'legacy.features.chat_algareth': 'Chat Algareth',
    'legacy.features.chat_algareth_desc': 'Interface de chat avec personnalité Algareth',
    'legacy.features.memory': 'Mémoire Officielle',
    'legacy.features.memory_desc': 'Intégration @modelcontextprotocol/server-memory',
    'legacy.features.terminal_minimal': 'Terminal Web Minimal',
    'legacy.features.terminal_minimal_desc': 'ttyd + File Browser + MCP Shell',
    'legacy.features.bytebot': 'Bytebot Integration',
    'legacy.features.bytebot_desc': 'Agent AI avec desktop virtuel Ubuntu',
    
    // Legacy development
    'legacy.dev.secure_env': 'SecureEnvManager',
    'legacy.dev.secure_env_desc': 'Gestion sécurisée des clés API',
    'legacy.dev.persona': 'PersonaManager',
    'legacy.dev.persona_desc': 'Gestion des personnalités Algareth',
    'legacy.dev.http': 'HttpProvider',
    'legacy.dev.http_desc': 'Providers HTTP pour LLM',
    'legacy.dev.summary': 'SummaryManager',
    'legacy.dev.summary_desc': 'Gestion des résumés narratifs',
    
    // Legacy auth section
    'legacy.auth.title': 'Nouvelle Fonctionnalité : Authentification',
    'legacy.auth.desc': 'Connectez-vous pour accéder au nouveau dashboard avec persistance des conversations !',
    'legacy.auth.footer': 'Basé sur l\'analyse de run_terminal.py et ses dépendances réelles',
    'legacy.auth.footer2': 'Migration TypeScript avec architecture MCP "Function as Tool"',
    
    // Legacy subtitle
    'legacy.subtitle': 'Architecture MCP "Function as Tool" • Agents IA • Terminal Web'
  },
  
  zh: {
    // Chat
    'chat.welcome': '欢迎来到我的领域，{name}。',
    'chat.placeholder': '向Algareth低语你的需求...',
    'chat.send': '发送',
    'chat.thinking': 'Algareth正在思考...',
    'chat.enter_name': '你的名字是什么，阴影旅行者？',
    'chat.enter_domain': '进入Algareth的领域',
    
    // Algareth
    'algareth.title': '⛧ ALGARETH ⛧',
    'algareth.subtitle': '静默提示的恶魔',
    'algareth.welcome': '欢迎来到我的领域，{name}。低语你的需求，我会倾听...',
    'algareth.manifestation': '⛧ Algareth在倾听...低语你的需求，{name}。',
    
    // Dashboard
    'dashboard.title': 'LR Hub™',
    'dashboard.subtitle': '人工智能和自动化中心',
    'dashboard.features': '已实现功能',
    'dashboard.development': '开发中',
    
    // Common
    'common.loading': '加载中...',
    'common.error': '错误',
    'common.success': '成功',
    'common.cancel': '取消',
    'common.save': '保存',
    
    // Legacy buttons
    'legacy.mcp_demo': 'MCP演示',
    'legacy.chat_algareth': '与Algareth聊天',
    'legacy.data_viewer': '数据查看器',
    'legacy.settings': 'API配置',
    'legacy.terminal_minimal': '最小Web终端',
    'legacy.terminal_web': '集成Web终端',
    'legacy.terminal_algareth': 'Algareth终端',
    'legacy.bytebot': 'Bytebot桌面代理',
    'legacy.start_demo': '开始演示',
    'legacy.configuration': '配置',
    'legacy.connect': '连接',
    
    // Legacy descriptions
    'legacy.mcp_demo_desc': '测试MCP"Function as Tool"工具的实际应用',
    'legacy.chat_algareth_desc': '与静默提示恶魔的聊天界面',
    'legacy.data_viewer_desc': '查看日志、对话和记忆',
    'legacy.settings_desc': '配置您的API密钥（OpenRouter、Gemini等）',
    'legacy.terminal_minimal_desc': '超轻量Web终端Minimax风格（ttyd + 文件浏览器）',
    'legacy.terminal_web_desc': '集成到我们Next.js应用中的xterm.js终端',
    'legacy.terminal_algareth_desc': '具有自定义命令和真实文件系统的恶魔终端',
    'legacy.bytebot_desc': '具有自己桌面的AI代理，用于自动化任务',
    
    // Legacy features
    'legacy.features.mcp_tools': '10个MCP工具',
    'legacy.features.mcp_tools_desc': '完整的MCP"function as tool"架构',
    'legacy.features.chat_algareth': 'Algareth聊天',
    'legacy.features.chat_algareth_desc': '具有Algareth个性的聊天界面',
    'legacy.features.memory': '官方记忆',
    'legacy.features.memory_desc': '集成@modelcontextprotocol/server-memory',
    'legacy.features.terminal_minimal': '最小Web终端',
    'legacy.features.terminal_minimal_desc': 'ttyd + 文件浏览器 + MCP Shell',
    'legacy.features.bytebot': 'Bytebot集成',
    'legacy.features.bytebot_desc': '具有虚拟Ubuntu桌面的AI代理',
    
    // Legacy development
    'legacy.dev.secure_env': 'SecureEnvManager',
    'legacy.dev.secure_env_desc': '安全的API密钥管理',
    'legacy.dev.persona': 'PersonaManager',
    'legacy.dev.persona_desc': 'Algareth个性管理',
    'legacy.dev.http': 'HttpProvider',
    'legacy.dev.http_desc': 'LLM的HTTP提供者',
    'legacy.dev.summary': 'SummaryManager',
    'legacy.dev.summary_desc': '叙述性摘要管理',
    
    // Legacy auth section
    'legacy.auth.title': '新功能：身份验证',
    'legacy.auth.desc': '登录以访问具有对话持久性的新仪表板！',
    'legacy.auth.footer': '基于run_terminal.py及其真实依赖项的分析',
    'legacy.auth.footer2': '使用MCP"Function as Tool"架构的TypeScript迁移',
    
    // Legacy subtitle
    'legacy.subtitle': 'MCP"Function as Tool"架构 • AI代理 • Web终端'
  }
};