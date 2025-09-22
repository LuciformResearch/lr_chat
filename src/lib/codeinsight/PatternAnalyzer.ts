/**
 * Pattern Analyzer for TypeScript Code
 * 
 * Analyzes TypeScript code to detect design patterns, architectural patterns,
 * anti-patterns, and performance issues.
 */

import { TypeScriptScope, PatternAnalysis } from './TypeScriptParser';

export class PatternAnalyzer {
  
  /**
   * Analyze patterns in TypeScript scopes
   */
  analyzePatterns(scopes: TypeScriptScope[]): PatternAnalysis {
    const analysis: PatternAnalysis = {
      designPatterns: [],
      architecturalPatterns: [],
      antiPatterns: [],
      performanceIssues: [],
      codeSmells: []
    };

    // Analyze each scope
    for (const scope of scopes) {
      this.analyzeScope(scope, analysis);
    }

    // Analyze cross-scope patterns
    this.analyzeCrossScopePatterns(scopes, analysis);

    return analysis;
  }

  /**
   * Analyze individual scope for patterns
   */
  private analyzeScope(scope: TypeScriptScope, analysis: PatternAnalysis): void {
    // Design Patterns
    this.detectDesignPatterns(scope, analysis);
    
    // Anti-patterns
    this.detectAntiPatterns(scope, analysis);
    
    // Performance Issues
    this.detectPerformanceIssues(scope, analysis);
    
    // Code Smells
    this.detectCodeSmells(scope, analysis);

    // Recursively analyze children
    for (const child of scope.children) {
      this.analyzeScope(child, analysis);
    }
  }

  /**
   * Detect design patterns
   */
  private detectDesignPatterns(scope: TypeScriptScope, analysis: PatternAnalysis): void {
    const content = scope.content.toLowerCase();
    const name = scope.name.toLowerCase();

    // Singleton Pattern
    if (this.isSingleton(scope)) {
      analysis.designPatterns.push('Singleton');
    }

    // Factory Pattern
    if (this.isFactory(scope)) {
      analysis.designPatterns.push('Factory');
    }

    // Observer Pattern
    if (this.isObserver(scope)) {
      analysis.designPatterns.push('Observer');
    }

    // Strategy Pattern
    if (this.isStrategy(scope)) {
      analysis.designPatterns.push('Strategy');
    }

    // Builder Pattern
    if (this.isBuilder(scope)) {
      analysis.designPatterns.push('Builder');
    }

    // Repository Pattern
    if (this.isRepository(scope)) {
      analysis.designPatterns.push('Repository');
    }

    // Service Pattern
    if (this.isService(scope)) {
      analysis.designPatterns.push('Service');
    }

    // Decorator Pattern
    if (this.isDecorator(scope)) {
      analysis.designPatterns.push('Decorator');
    }
  }

  /**
   * Detect anti-patterns
   */
  private detectAntiPatterns(scope: TypeScriptScope, analysis: PatternAnalysis): void {
    // God Class
    if (this.isGodClass(scope)) {
      analysis.antiPatterns.push('God Class');
    }

    // Long Method
    if (this.isLongMethod(scope)) {
      analysis.antiPatterns.push('Long Method');
    }

    // Feature Envy
    if (this.isFeatureEnvy(scope)) {
      analysis.antiPatterns.push('Feature Envy');
    }

    // Data Clumps
    if (this.isDataClumps(scope)) {
      analysis.antiPatterns.push('Data Clumps');
    }

    // Shotgun Surgery
    if (this.isShotgunSurgery(scope)) {
      analysis.antiPatterns.push('Shotgun Surgery');
    }

    // Spaghetti Code
    if (this.isSpaghettiCode(scope)) {
      analysis.antiPatterns.push('Spaghetti Code');
    }
  }

  /**
   * Detect performance issues
   */
  private detectPerformanceIssues(scope: TypeScriptScope, analysis: PatternAnalysis): void {
    const content = scope.content;

    // Memory Leaks
    if (this.hasMemoryLeaks(content)) {
      analysis.performanceIssues.push('Potential Memory Leak');
    }

    // N+1 Queries
    if (this.hasNPlusOneQueries(content)) {
      analysis.performanceIssues.push('N+1 Query Problem');
    }

    // Inefficient Loops
    if (this.hasInefficientLoops(content)) {
      analysis.performanceIssues.push('Inefficient Loop');
    }

    // Blocking Operations
    if (this.hasBlockingOperations(content)) {
      analysis.performanceIssues.push('Blocking Operation');
    }

    // Large Object Creation
    if (this.hasLargeObjectCreation(content)) {
      analysis.performanceIssues.push('Large Object Creation');
    }
  }

  /**
   * Detect code smells
   */
  private detectCodeSmells(scope: TypeScriptScope, analysis: PatternAnalysis): void {
    // Duplicate Code
    if (this.hasDuplicateCode(scope)) {
      analysis.codeSmells.push('Duplicate Code');
    }

    // Dead Code
    if (this.hasDeadCode(scope)) {
      analysis.codeSmells.push('Dead Code');
    }

    // Magic Numbers
    if (this.hasMagicNumbers(scope)) {
      analysis.codeSmells.push('Magic Numbers');
    }

    // Long Parameter List
    if (this.hasLongParameterList(scope)) {
      analysis.codeSmells.push('Long Parameter List');
    }

    // Primitive Obsession
    if (this.hasPrimitiveObsession(scope)) {
      analysis.codeSmells.push('Primitive Obsession');
    }
  }

  /**
   * Analyze cross-scope patterns
   */
  private analyzeCrossScopePatterns(scopes: TypeScriptScope[], analysis: PatternAnalysis): void {
    // MVC Pattern
    if (this.isMVC(scopes)) {
      analysis.architecturalPatterns.push('MVC');
    }

    // Layered Architecture
    if (this.isLayeredArchitecture(scopes)) {
      analysis.architecturalPatterns.push('Layered Architecture');
    }

    // Microservices
    if (this.isMicroservices(scopes)) {
      analysis.architecturalPatterns.push('Microservices');
    }

    // Event-Driven Architecture
    if (this.isEventDriven(scopes)) {
      analysis.architecturalPatterns.push('Event-Driven Architecture');
    }
  }

  // Design Pattern Detection Methods

  private isSingleton(scope: TypeScriptScope): boolean {
    if (scope.type !== 'class') return false;
    const content = scope.content.toLowerCase();
    return content.includes('private static instance') && 
           content.includes('getinstance') &&
           scope.modifiers.includes('static');
  }

  private isFactory(scope: TypeScriptScope): boolean {
    const name = scope.name.toLowerCase();
    const content = scope.content.toLowerCase();
    return (name.includes('factory') || name.includes('creator')) &&
           content.includes('create') && content.includes('return');
  }

  private isObserver(scope: TypeScriptScope): boolean {
    const content = scope.content.toLowerCase();
    return content.includes('subscribe') && content.includes('notify') &&
           (content.includes('observable') || content.includes('listener'));
  }

  private isStrategy(scope: TypeScriptScope): boolean {
    const content = scope.content.toLowerCase();
    return content.includes('strategy') || 
           (content.includes('algorithm') && content.includes('execute'));
  }

  private isBuilder(scope: TypeScriptScope): boolean {
    const name = scope.name.toLowerCase();
    const content = scope.content.toLowerCase();
    return name.includes('builder') && content.includes('build');
  }

  private isRepository(scope: TypeScriptScope): boolean {
    const name = scope.name.toLowerCase();
    const content = scope.content.toLowerCase();
    return name.includes('repository') && 
           (content.includes('find') || content.includes('save') || content.includes('delete'));
  }

  private isService(scope: TypeScriptScope): boolean {
    const name = scope.name.toLowerCase();
    return name.includes('service') && scope.type === 'class';
  }

  private isDecorator(scope: TypeScriptScope): boolean {
    const content = scope.content.toLowerCase();
    return content.includes('@') && content.includes('decorator');
  }

  // Anti-pattern Detection Methods

  private isGodClass(scope: TypeScriptScope): boolean {
    if (scope.type !== 'class') return false;
    return scope.complexity > 20 || scope.children.length > 15;
  }

  private isLongMethod(scope: TypeScriptScope): boolean {
    if (scope.type !== 'function' && scope.type !== 'method') return false;
    const lines = scope.content.split('\n').length;
    return lines > 50;
  }

  private isFeatureEnvy(scope: TypeScriptScope): boolean {
    // Simple heuristic: more external dependencies than internal
    return scope.dependencies.length > 5;
  }

  private isDataClumps(scope: TypeScriptScope): boolean {
    // Simple heuristic: many parameters with similar types
    return scope.parameters && scope.parameters.length > 5;
  }

  private isShotgunSurgery(scope: TypeScriptScope): boolean {
    // Simple heuristic: high coupling
    return scope.dependencies.length > 10;
  }

  private isSpaghettiCode(scope: TypeScriptScope): boolean {
    // Simple heuristic: high complexity and many dependencies
    return scope.complexity > 15 && scope.dependencies.length > 8;
  }

  // Performance Issue Detection Methods

  private hasMemoryLeaks(content: string): boolean {
    const leakPatterns = [
      /addEventListener.*(?!removeEventListener)/,
      /setInterval.*(?!clearInterval)/,
      /setTimeout.*(?!clearTimeout)/,
      /new\s+EventTarget.*(?!removeEventListener)/
    ];
    
    return leakPatterns.some(pattern => pattern.test(content));
  }

  private hasNPlusOneQueries(content: string): boolean {
    // Simple heuristic: loops with database calls
    return /for\s*\(.*\).*\.(find|query|select)/.test(content) ||
           /while\s*\(.*\).*\.(find|query|select)/.test(content);
  }

  private hasInefficientLoops(content: string): boolean {
    // Simple heuristic: nested loops
    const loopCount = (content.match(/for\s*\(/g) || []).length + 
                     (content.match(/while\s*\(/g) || []).length;
    return loopCount > 3;
  }

  private hasBlockingOperations(content: string): boolean {
    const blockingPatterns = [
      /fs\.readFileSync/,
      /JSON\.parse\(.*\)/,
      /eval\(/,
      /new\s+Function\(/
    ];
    
    return blockingPatterns.some(pattern => pattern.test(content));
  }

  private hasLargeObjectCreation(content: string): boolean {
    // Simple heuristic: large object literals
    const objectMatches = content.match(/\{[^}]{500,}\}/g);
    return objectMatches && objectMatches.length > 0;
  }

  // Code Smell Detection Methods

  private hasDuplicateCode(scope: TypeScriptScope): boolean {
    // Simple heuristic: repeated code blocks
    const lines = scope.content.split('\n');
    const uniqueLines = new Set(lines);
    return lines.length - uniqueLines.size > 5;
  }

  private hasDeadCode(scope: TypeScriptScope): boolean {
    // Simple heuristic: unused exports
    return scope.exports.length > 0 && scope.dependencies.length === 0;
  }

  private hasMagicNumbers(scope: TypeScriptScope): boolean {
    // Simple heuristic: hardcoded numbers
    const numbers = scope.content.match(/\b\d{3,}\b/g);
    return numbers && numbers.length > 3;
  }

  private hasLongParameterList(scope: TypeScriptScope): boolean {
    return scope.parameters && scope.parameters.length > 5;
  }

  private hasPrimitiveObsession(scope: TypeScriptScope): boolean {
    // Simple heuristic: many primitive parameters
    return scope.parameters && scope.parameters.length > 3 &&
           scope.parameters.every(p => /^(string|number|boolean)$/.test(p));
  }

  // Architectural Pattern Detection Methods

  private isMVC(scopes: TypeScriptScope[]): boolean {
    const hasModel = scopes.some(s => s.name.toLowerCase().includes('model'));
    const hasView = scopes.some(s => s.name.toLowerCase().includes('view'));
    const hasController = scopes.some(s => s.name.toLowerCase().includes('controller'));
    return hasModel && hasView && hasController;
  }

  private isLayeredArchitecture(scopes: TypeScriptScope[]): boolean {
    const layers = ['presentation', 'business', 'data', 'service', 'repository'];
    return layers.some(layer => 
      scopes.some(s => s.name.toLowerCase().includes(layer))
    );
  }

  private isMicroservices(scopes: TypeScriptScope[]): boolean {
    const serviceScopes = scopes.filter(s => s.name.toLowerCase().includes('service'));
    return serviceScopes.length > 3;
  }

  private isEventDriven(scopes: TypeScriptScope[]): boolean {
    return scopes.some(s => 
      s.content.toLowerCase().includes('event') && 
      s.content.toLowerCase().includes('emit')
    );
  }
}