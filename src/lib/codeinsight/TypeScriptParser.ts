/**
 * TypeScript Parser using Tree-sitter
 * 
 * Parse TypeScript code and extract scopes, patterns, and metadata
 * for CodeInsight analysis.
 */

import { Parser, Tree, SyntaxNode, Language } from 'web-tree-sitter';

export interface TypeScriptScope {
  type: 'class' | 'interface' | 'function' | 'method' | 'module' | 'namespace' | 'enum' | 'type_alias';
  name: string;
  startLine: number;
  endLine: number;
  content: string;
  parameters?: string[];
  returnType?: string;
  modifiers: string[];
  dependencies: string[];
  exports: string[];
  complexity: number;
  children: TypeScriptScope[];
}

export interface PatternAnalysis {
  designPatterns: string[];
  architecturalPatterns: string[];
  antiPatterns: string[];
  performanceIssues: string[];
  codeSmells: string[];
}

export interface TypeScriptMetrics {
  linesOfCode: number;
  cyclomaticComplexity: number;
  maintainabilityIndex: number;
  testabilityScore: number;
  couplingScore: number;
  cohesionScore: number;
}

export interface CodeInsightReport {
  file: string;
  scopes: TypeScriptScope[];
  patterns: PatternAnalysis;
  metrics: TypeScriptMetrics;
  recommendations: string[];
  summary: string;
}

export class TypeScriptParser {
  private parser: Parser | null = null;
  private initialized: boolean = false;

  constructor() {
    // Parser will be created in initialize()
  }

  /**
   * Initialize the parser with TypeScript language
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await Parser.init();
      
      // Create parser after init
      this.parser = new Parser();
      
      // Load TypeScript language
      const TypeScript = await Language.load(
        require.resolve('tree-sitter-typescript/tree-sitter-typescript.wasm')
      );
      
      this.parser.setLanguage(TypeScript);
      this.initialized = true;
      
      console.log('✅ TypeScript Parser initialized with Tree-sitter');
    } catch (error) {
      console.error('❌ Failed to initialize TypeScript Parser:', error);
      throw error;
    }
  }

  /**
   * Parse a TypeScript file and extract scopes
   */
  async parseFile(filePath: string, content: string): Promise<TypeScriptScope[]> {
    if (!this.initialized || !this.parser) {
      await this.initialize();
    }

    try {
      const tree = this.parser!.parse(content);
      const scopes: TypeScriptScope[] = [];

      this.extractScopes(tree.rootNode, scopes, content);
      
      console.log(`📊 Parsed ${filePath}: ${scopes.length} scopes found`);
      return scopes;
    } catch (error) {
      console.error(`❌ Failed to parse ${filePath}:`, error);
      return [];
    }
  }

  /**
   * Extract scopes from AST node
   */
  private extractScopes(node: SyntaxNode, scopes: TypeScriptScope[], content: string): void {
    // Extract different types of scopes
    if (node.type === 'class_declaration') {
      scopes.push(this.extractClass(node, content));
    } else if (node.type === 'interface_declaration') {
      scopes.push(this.extractInterface(node, content));
    } else if (node.type === 'function_declaration') {
      scopes.push(this.extractFunction(node, content));
    } else if (node.type === 'method_definition') {
      scopes.push(this.extractMethod(node, content));
    } else if (node.type === 'enum_declaration') {
      scopes.push(this.extractEnum(node, content));
    } else if (node.type === 'type_alias_declaration') {
      scopes.push(this.extractTypeAlias(node, content));
    }

    // Recursively process children
    for (const child of node.children) {
      this.extractScopes(child, scopes, content);
    }
  }

  /**
   * Extract class information
   */
  private extractClass(node: SyntaxNode, content: string): TypeScriptScope {
    const name = this.getNodeText(node.childForFieldName('name'), content) || 'AnonymousClass';
    const startLine = node.startPosition.row + 1;
    const endLine = node.endPosition.row + 1;
    const nodeContent = this.getNodeText(node, content);
    
    const modifiers = this.extractModifiers(node);
    const children: TypeScriptScope[] = [];
    
    // Extract methods and properties
    for (const child of node.children) {
      if (child.type === 'method_definition') {
        children.push(this.extractMethod(child, content));
      }
    }

    return {
      type: 'class',
      name,
      startLine,
      endLine,
      content: nodeContent,
      modifiers,
      dependencies: this.extractDependencies(nodeContent),
      exports: [name],
      complexity: this.calculateComplexity(node),
      children
    };
  }

  /**
   * Extract interface information
   */
  private extractInterface(node: SyntaxNode, content: string): TypeScriptScope {
    const name = this.getNodeText(node.childForFieldName('name'), content) || 'AnonymousInterface';
    const startLine = node.startPosition.row + 1;
    const endLine = node.endPosition.row + 1;
    const nodeContent = this.getNodeText(node, content);
    
    const modifiers = this.extractModifiers(node);

    return {
      type: 'interface',
      name,
      startLine,
      endLine,
      content: nodeContent,
      modifiers,
      dependencies: this.extractDependencies(nodeContent),
      exports: [name],
      complexity: this.calculateComplexity(node),
      children: []
    };
  }

  /**
   * Extract function information
   */
  private extractFunction(node: SyntaxNode, content: string): TypeScriptScope {
    const name = this.getNodeText(node.childForFieldName('name'), content) || 'AnonymousFunction';
    const startLine = node.startPosition.row + 1;
    const endLine = node.endPosition.row + 1;
    const nodeContent = this.getNodeText(node, content);
    
    const modifiers = this.extractModifiers(node);
    const parameters = this.extractParameters(node, content);
    const returnType = this.extractReturnType(node, content);

    return {
      type: 'function',
      name,
      startLine,
      endLine,
      content: nodeContent,
      parameters,
      returnType,
      modifiers,
      dependencies: this.extractDependencies(nodeContent),
      exports: [name],
      complexity: this.calculateComplexity(node),
      children: []
    };
  }

  /**
   * Extract method information
   */
  private extractMethod(node: SyntaxNode, content: string): TypeScriptScope {
    const name = this.getNodeText(node.childForFieldName('name'), content) || 'AnonymousMethod';
    const startLine = node.startPosition.row + 1;
    const endLine = node.endPosition.row + 1;
    const nodeContent = this.getNodeText(node, content);
    
    const modifiers = this.extractModifiers(node);
    const parameters = this.extractParameters(node, content);
    const returnType = this.extractReturnType(node, content);

    return {
      type: 'method',
      name,
      startLine,
      endLine,
      content: nodeContent,
      parameters,
      returnType,
      modifiers,
      dependencies: this.extractDependencies(nodeContent),
      exports: [name],
      complexity: this.calculateComplexity(node),
      children: []
    };
  }

  /**
   * Extract enum information
   */
  private extractEnum(node: SyntaxNode, content: string): TypeScriptScope {
    const name = this.getNodeText(node.childForFieldName('name'), content) || 'AnonymousEnum';
    const startLine = node.startPosition.row + 1;
    const endLine = node.endPosition.row + 1;
    const nodeContent = this.getNodeText(node, content);
    
    const modifiers = this.extractModifiers(node);

    return {
      type: 'enum',
      name,
      startLine,
      endLine,
      content: nodeContent,
      modifiers,
      dependencies: this.extractDependencies(nodeContent),
      exports: [name],
      complexity: this.calculateComplexity(node),
      children: []
    };
  }

  /**
   * Extract type alias information
   */
  private extractTypeAlias(node: SyntaxNode, content: string): TypeScriptScope {
    const name = this.getNodeText(node.childForFieldName('name'), content) || 'AnonymousType';
    const startLine = node.startPosition.row + 1;
    const endLine = node.endPosition.row + 1;
    const nodeContent = this.getNodeText(node, content);
    
    const modifiers = this.extractModifiers(node);

    return {
      type: 'type_alias',
      name,
      startLine,
      endLine,
      content: nodeContent,
      modifiers,
      dependencies: this.extractDependencies(nodeContent),
      exports: [name],
      complexity: this.calculateComplexity(node),
      children: []
    };
  }

  /**
   * Extract modifiers (public, private, static, etc.)
   */
  private extractModifiers(node: SyntaxNode): string[] {
    const modifiers: string[] = [];
    
    for (const child of node.children) {
      if (child.type === 'accessibility_modifier' || 
          child.type === 'static' || 
          child.type === 'abstract' ||
          child.type === 'override') {
        modifiers.push(child.type);
      }
    }
    
    return modifiers;
  }

  /**
   * Extract function parameters
   */
  private extractParameters(node: SyntaxNode, content: string): string[] {
    const parameters: string[] = [];
    const paramsNode = node.childForFieldName('parameters');
    
    if (paramsNode) {
      for (const child of paramsNode.children) {
        if (child.type === 'required_parameter' || child.type === 'optional_parameter') {
          const name = this.getNodeText(child.childForFieldName('pattern'), content);
          if (name) parameters.push(name);
        }
      }
    }
    
    return parameters;
  }

  /**
   * Extract return type
   */
  private extractReturnType(node: SyntaxNode, content: string): string | undefined {
    const returnTypeNode = node.childForFieldName('return_type');
    return returnTypeNode ? this.getNodeText(returnTypeNode, content) : undefined;
  }

  /**
   * Extract dependencies from content
   */
  private extractDependencies(content: string): string[] {
    const dependencies: string[] = [];
    const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
    const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
    
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      dependencies.push(match[1]);
    }
    
    while ((match = requireRegex.exec(content)) !== null) {
      dependencies.push(match[1]);
    }
    
    return [...new Set(dependencies)]; // Remove duplicates
  }

  /**
   * Calculate complexity score
   */
  private calculateComplexity(node: SyntaxNode): number {
    let complexity = 1; // Base complexity
    
    // Count control flow statements
    const controlFlowTypes = [
      'if_statement', 'for_statement', 'while_statement', 
      'switch_statement', 'try_statement', 'catch_clause'
    ];
    
    const countNodes = (n: SyntaxNode): number => {
      let count = 0;
      if (controlFlowTypes.includes(n.type)) {
        count++;
      }
      for (const child of n.children) {
        count += countNodes(child);
      }
      return count;
    };
    
    complexity += countNodes(node);
    return complexity;
  }

  /**
   * Get text content of a node
   */
  private getNodeText(node: SyntaxNode | null, content: string): string {
    if (!node) return '';
    return content.slice(node.startIndex, node.endIndex);
  }
}