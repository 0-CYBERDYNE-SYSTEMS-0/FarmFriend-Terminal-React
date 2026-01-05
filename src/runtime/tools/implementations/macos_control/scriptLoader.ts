import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname, basename } from "node:path";

export interface ScriptMetadata {
  id: string;
  title: string;
  description: string;
  language: "applescript" | "jxa";
  params?: string[];
  category?: string;
  author?: string;
}

export interface LoadedScript {
  metadata: ScriptMetadata;
  content: string;
  filePath: string;
}

/**
 * Parse simple frontmatter from script files.
 * Format:
 * ---
 * id: script_id
 * title: Script Title
 * description: What this script does
 * params: url, title
 * ---
 * <script content>
 */
function parseFrontmatter(content: string): { metadata: Record<string, string>; body: string } {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { metadata: {}, body: content };
  }

  const [, frontmatterText, body] = match;
  const metadata: Record<string, string> = {};

  // Parse simple key: value pairs
  frontmatterText.split("\n").forEach((line) => {
    const colonIndex = line.indexOf(":");
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();
      if (key && value) {
        metadata[key] = value;
      }
    }
  });

  return { metadata, body: body.trim() };
}

/**
 * Determine language from file extension
 */
function inferLanguage(filePath: string): "applescript" | "jxa" {
  const ext = extname(filePath).toLowerCase();
  if (ext === ".js" || ext === ".jxa") {
    return "jxa";
  }
  return "applescript";
}

/**
 * Load a single script file
 */
function loadScript(filePath: string, category?: string): LoadedScript | null {
  try {
    const content = readFileSync(filePath, "utf8");
    const { metadata: rawMetadata, body } = parseFrontmatter(content);

    const language = inferLanguage(filePath);
    const filename = basename(filePath, extname(filePath));

    // Build metadata with defaults
    const metadata: ScriptMetadata = {
      id: rawMetadata.id || filename,
      title: rawMetadata.title || filename,
      description: rawMetadata.description || "",
      language,
      category: category || rawMetadata.category,
      author: rawMetadata.author,
    };

    // Parse params if present
    if (rawMetadata.params) {
      metadata.params = rawMetadata.params.split(",").map((p) => p.trim());
    }

    return {
      metadata,
      content: body,
      filePath,
    };
  } catch (error) {
    console.warn(`Failed to load script ${filePath}:`, error);
    return null;
  }
}

/**
 * Recursively scan directory for script files
 */
function scanDirectory(dir: string, category?: string): LoadedScript[] {
  const scripts: LoadedScript[] = [];

  try {
    const entries = readdirSync(dir);

    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        // Recurse with category name
        const subCategory = category ? `${category}/${entry}` : entry;
        scripts.push(...scanDirectory(fullPath, subCategory));
      } else if (stat.isFile()) {
        const ext = extname(entry).toLowerCase();
        if (ext === ".applescript" || ext === ".scpt" || ext === ".js" || ext === ".jxa") {
          const script = loadScript(fullPath, category);
          if (script) {
            scripts.push(script);
          }
        }
      }
    }
  } catch (error) {
    console.warn(`Failed to scan directory ${dir}:`, error);
  }

  return scripts;
}

/**
 * Knowledge base cache
 */
let knowledgeBaseCache: Map<string, LoadedScript> | null = null;

/**
 * Load all scripts from knowledge base directory
 */
export function loadKnowledgeBase(kbDir: string): Map<string, LoadedScript> {
  if (knowledgeBaseCache) {
    return knowledgeBaseCache;
  }

  const scripts = scanDirectory(kbDir);
  const scriptMap = new Map<string, LoadedScript>();

  for (const script of scripts) {
    scriptMap.set(script.metadata.id, script);
  }

  knowledgeBaseCache = scriptMap;
  return scriptMap;
}

/**
 * Get script by ID from knowledge base
 */
export function getScript(kbDir: string, scriptId: string): LoadedScript | null {
  const kb = loadKnowledgeBase(kbDir);
  return kb.get(scriptId) || null;
}

/**
 * List all available scripts
 */
export function listScripts(kbDir: string): ScriptMetadata[] {
  const kb = loadKnowledgeBase(kbDir);
  return Array.from(kb.values()).map((s) => s.metadata);
}

/**
 * Substitute parameters in script content
 * Replaces {param_name} with values from params object
 */
export function substituteParams(content: string, params: Record<string, string>): string {
  let result = content;

  // Replace {param_name} with values
  for (const [key, value] of Object.entries(params)) {
    const regex = new RegExp(`\\{${key}\\}`, "g");
    result = result.replace(regex, value);
  }

  return result;
}

/**
 * Validate required parameters are present
 */
export function validateParams(script: LoadedScript, params: Record<string, string>): string[] {
  const missing: string[] = [];

  if (script.metadata.params) {
    for (const param of script.metadata.params) {
      if (!(param in params)) {
        missing.push(param);
      }
    }
  }

  return missing;
}

/**
 * Clear knowledge base cache (useful for testing/reloading)
 */
export function clearCache(): void {
  knowledgeBaseCache = null;
}
