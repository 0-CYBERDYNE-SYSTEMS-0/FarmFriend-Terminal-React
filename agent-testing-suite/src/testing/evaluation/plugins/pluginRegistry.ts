import { promises as fs } from "node:fs";
import path from "node:path";
import { EvaluationResult, ScenarioResult, Evaluator } from "../../types.js";

/**
 * Plugin system for custom evaluators
 * Inspired by LangChain's extensible architecture and Elastic's LLM judges
 */

export interface EvaluatorPlugin {
  name: string;
  version: string;
  description: string;

  // Lifecycle hooks
  initialize?(config: any): Promise<void>;
  validate?(assertion: any): { valid: boolean; errors: string[] };
  evaluate(assertion: any, context: any): Promise<EvaluationResult>;
  cleanup?(): Promise<void>;

  // Metadata
  supported_types: string[];
  complexity?: "simple" | "medium" | "complex";
}

interface PluginConfig {
  pluginsDir: string;
  enabledPlugins: string[];
  pluginConfigs: Record<string, any>;
}

/**
 * Plugin registry for managing custom evaluators
 */
export class PluginRegistry {
  private config: PluginConfig;
  private plugins: Map<string, EvaluatorPlugin>;
  private initialized: Set<string>;

  constructor(config: Partial<PluginConfig> = {}) {
    this.config = {
      pluginsDir: config.pluginsDir || "./src/testing/evaluation/plugins",
      enabledPlugins: config.enabledPlugins || [],
      pluginConfigs: config.pluginConfigs || {}
    };
    this.plugins = new Map();
    this.initialized = new Set();
  }

  /**
   * Load all plugins from directory
   */
  async loadPlugins(): Promise<void> {
    const pluginFiles = await this.discoverPlugins();

    for (const file of pluginFiles) {
      try {
        const plugin = await this.importPlugin(file);
        this.registerPlugin(plugin);
      } catch (err: any) {
        console.error(`Failed to load plugin ${file}:`, err.message);
      }
    }

    console.log(`✅ Loaded ${this.plugins.size} plugins`);
    this.listPlugins();
  }

  /**
   * Discover plugin files in directory
   */
  private async discoverPlugins(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.config.pluginsDir);
      return files.filter(f => f.endsWith(".js") && !f.endsWith(".test.js"));
    } catch (err: any) {
      if (err.code === "ENOENT") {
        console.warn(`Plugins directory not found: ${this.config.pluginsDir}`);
        return [];
      }
      throw err;
    }
  }

  /**
   * Import plugin module dynamically
   */
  private async importPlugin(filePath: string): Promise<EvaluatorPlugin> {
    const fullPath = path.join(this.config.pluginsDir, filePath);
    const module = await import(fullPath);

    // Find default export or named plugin exports
    const plugin = module.default || module.plugin || module;

    if (!plugin.name || typeof plugin.evaluate !== "function") {
      throw new Error(`Invalid plugin structure in ${filePath}`);
    }

    return plugin as EvaluatorPlugin;
  }

  /**
   * Register a plugin
   */
  registerPlugin(plugin: EvaluatorPlugin): void {
    if (this.plugins.has(plugin.name)) {
      console.warn(`Plugin ${plugin.name} already registered, overwriting`);
    }

    this.plugins.set(plugin.name, plugin);
  }

  /**
   * List all registered plugins
   */
  listPlugins(): void {
    console.log("\n📦 Available Plugins:");
    console.log("─".repeat(60));

    for (const [name, plugin] of this.plugins.entries()) {
      const enabled = this.config.enabledPlugins.includes(name);
      const status = enabled ? "✅" : "⏸️ ";
      const complexity = plugin.complexity || "simple";

      console.log(`${status} ${name} v${plugin.version}`);
      console.log(`   ${plugin.description}`);
      console.log(`   Complexity: ${complexity}`);
      console.log(`   Types: ${plugin.supported_types.join(", ")}`);
      console.log();
    }
  }

  /**
   * Initialize a plugin
   */
  async initializePlugin(name: string): Promise<void> {
    const plugin = this.plugins.get(name);

    if (!plugin) {
      throw new Error(`Plugin not found: ${name}`);
    }

    if (this.initialized.has(name)) {
      console.log(`Plugin ${name} already initialized`);
      return;
    }

    const config = this.config.pluginConfigs[name] || {};

    if (plugin.initialize) {
      await plugin.initialize(config);
    }

    this.initialized.add(name);
    console.log(`✅ Initialized plugin: ${name}`);
  }

  /**
   * Initialize all enabled plugins
   */
  async initializeAll(): Promise<void> {
    console.log("\n🔧 Initializing plugins...");

    for (const name of this.config.enabledPlugins) {
      try {
        await this.initializePlugin(name);
      } catch (err: any) {
        console.error(`Failed to initialize ${name}:`, err.message);
      }
    }
  }

  /**
   * Validate an assertion
   */
  validateAssertion(assertion: any): { valid: boolean; errors: string[] } {
    const plugin = this.plugins.get(assertion.type);

    if (!plugin) {
      return {
        valid: false,
        errors: [`No plugin found for type: ${assertion.type}`]
      };
    }

    if (!this.config.enabledPlugins.includes(assertion.type)) {
      return {
        valid: false,
        errors: [`Plugin ${assertion.type} is not enabled`]
      };
    }

    if (plugin.validate) {
      return plugin.validate(assertion);
    }

    return { valid: true, errors: [] };
  }

  /**
   * Evaluate an assertion using plugin
   */
  async evaluateAssertion(
    assertion: any,
    result: ScenarioResult,
    context: any
  ): Promise<EvaluationResult> {
    const plugin = this.plugins.get(assertion.type);

    if (!plugin) {
      throw new Error(`No plugin found for type: ${assertion.type}`);
    }

    if (!this.initialized.has(assertion.type) && plugin.initialize) {
      await this.initializePlugin(assertion.type);
    }

    // Extend context with assertion and plugin config
    const enhancedContext = {
      ...context,
      assertion,
      pluginConfig: this.config.pluginConfigs[assertion.type] || {}
    };

    return await plugin.evaluate(assertion, enhancedContext);
  }

  /**
   * Cleanup all plugins
   */
  async cleanup(): Promise<void> {
    console.log("\n🧹 Cleaning up plugins...");

    for (const [name, plugin] of this.plugins.entries()) {
      if (this.initialized.has(name) && plugin.cleanup) {
        try {
          await plugin.cleanup();
          this.initialized.delete(name);
          console.log(`✅ Cleaned up: ${name}`);
        } catch (err: any) {
          console.error(`Failed to cleanup ${name}:`, err.message);
        }
      }
    }
  }

  /**
   * Get plugin by name
   */
  getPlugin(name: string): EvaluatorPlugin | undefined {
    return this.plugins.get(name);
  }

  /**
   * Get all plugins
   */
  getAllPlugins(): Map<string, EvaluatorPlugin> {
    return new Map(this.plugins);
  }

  /**
   * Get enabled plugins
   */
  getEnabledPlugins(): EvaluatorPlugin[] {
    return this.config.enabledPlugins
      .map(name => this.plugins.get(name))
      .filter((p): p is EvaluatorPlugin => p !== undefined);
  }

  /**
   * Enable a plugin
   */
  enablePlugin(name: string): void {
    if (!this.plugins.has(name)) {
      throw new Error(`Plugin not found: ${name}`);
    }

    if (!this.config.enabledPlugins.includes(name)) {
      this.config.enabledPlugins.push(name);
    }
  }

  /**
   * Disable a plugin
   */
  disablePlugin(name: string): void {
    this.config.enabledPlugins = this.config.enabledPlugins.filter(
      n => n !== name
    );
  }
}

/**
 * Create global registry instance
 */
let globalRegistry: PluginRegistry | null = null;

export function getGlobalRegistry(): PluginRegistry {
  if (!globalRegistry) {
    globalRegistry = new PluginRegistry();
  }
  return globalRegistry;
}

export function setGlobalRegistry(registry: PluginRegistry): void {
  globalRegistry = registry;
}
