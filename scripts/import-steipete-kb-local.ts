#!/usr/bin/env tsx
/**
 * Import steipete/macos-automator-mcp knowledge base from local clone
 * Converts from their format to our format with zero MCP dependencies
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync, statSync } from 'fs';
import { join, dirname as pathDirname } from 'path';

const KB_SOURCE_PATH = '/tmp/macos-automator-mcp/knowledge_base';
const KB_TARGET_PATH = join(process.cwd(), 'src/runtime/tools/implementations/macos_control/kb');

interface ParsedScript {
  id: string;
  title: string;
  description: string;
  language: 'applescript' | 'jxa';
  params: string[];
  code: string;
  category?: string;
  isComplex?: boolean;
}

let stats = {
  fetched: 0,
  converted: 0,
  skipped: 0,
  errors: 0,
};

/**
 * Parse YAML frontmatter from markdown
 */
function parseFrontmatter(content: string): { metadata: Record<string, any>; body: string } {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { metadata: {}, body: content };
  }

  const [, frontmatterText, body] = match;
  const metadata: Record<string, any> = {};

  // Parse YAML-like frontmatter
  const lines = frontmatterText.split('\n');
  let currentKey = '';
  let arrayMode = false;

  for (const line of lines) {
    if (line.trim().startsWith('#')) continue; // Skip comments

    if (line.includes(':')) {
      const colonIndex = line.indexOf(':');
      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();

      if (value === '') {
        // Multi-line value or array
        currentKey = key;
        if (line.trimEnd().endsWith(':')) {
          metadata[key] = [];
          arrayMode = true;
        } else {
          metadata[key] = '';
        }
      } else {
        metadata[key] = value.replace(/^['"]|['"]$/g, ''); // Remove quotes
        currentKey = key;
        arrayMode = false;
      }
    } else if (line.trim().startsWith('-') && arrayMode && currentKey) {
      // Array item
      const item = line.trim().slice(1).trim();
      if (!Array.isArray(metadata[currentKey])) {
        metadata[currentKey] = [];
      }
      metadata[currentKey].push(item);
    } else if (line.trim() && currentKey && !arrayMode) {
      // Multi-line string continuation
      metadata[currentKey] += '\n' + line;
    }
  }

  return { metadata, body: body.trim() };
}

/**
 * Extract code from markdown code blocks
 */
function extractCodeBlocks(markdown: string): string[] {
  const codeBlockRegex = /```(?:applescript|javascript|js)?\s*\n([\s\S]*?)\n```/g;
  const blocks: string[] = [];
  let match;

  while ((match = codeBlockRegex.exec(markdown)) !== null) {
    blocks.push(match[1].trim());
  }

  return blocks;
}

/**
 * Convert MCP placeholders to our format
 */
function convertPlaceholders(code: string): string {
  // Convert --MCP_INPUT:paramName to {paramName}
  let converted = code.replace(/--MCP_INPUT:(\w+)/g, '{$1}');

  // Convert --MCP_ARG_1, --MCP_ARG_2, etc. to {arg1}, {arg2}
  converted = converted.replace(/--MCP_ARG_(\d+)/g, (_, num) => `{arg${num}}`);

  return converted;
}

/**
 * Extract parameter names from argumentsPrompt
 */
function extractParams(argumentsPrompt: string): string[] {
  if (!argumentsPrompt) return [];

  const params: string[] = [];
  const lines = argumentsPrompt.split('\n');

  for (const line of lines) {
    // Match "- paramName (type):" or "- paramName:" patterns
    const match = line.match(/^\s*-\s+(\w+)\s*(?:\(|:)/);
    if (match) {
      params.push(match[1]);
    }
  }

  return params;
}

/**
 * Parse markdown script file
 */
function parseScript(content: string, filePath: string): ParsedScript | null {
  try {
    const { metadata, body } = parseFrontmatter(content);

    // Extract code blocks
    const codeBlocks = extractCodeBlocks(body);
    if (codeBlocks.length === 0) {
      console.warn(`  ⚠️  No code blocks found in ${filePath}`);
      return null;
    }

    // Use first code block
    const rawCode = codeBlocks[0];
    const code = convertPlaceholders(rawCode);

    // Determine language
    const language = metadata.language === 'javascript' ? 'jxa' : 'applescript';

    // Extract params
    let params: string[] = [];
    if (metadata.argumentsPrompt) {
      params = extractParams(metadata.argumentsPrompt);
    }

    // Generate ID from metadata or filename
    const id = metadata.id || filePath.replace('.md', '').replace(/_/g, '/');

    return {
      id,
      title: metadata.title || id,
      description: metadata.description || '',
      language,
      params,
      code,
      category: metadata.category,
      isComplex: metadata.isComplex === true,
    };
  } catch (error) {
    console.error(`  ❌ Error parsing ${filePath}:`, error);
    stats.errors++;
    return null;
  }
}

/**
 * Generate our frontmatter format
 */
function generateFrontmatter(script: ParsedScript): string {
  const lines = [
    '---',
    `id: ${script.id}`,
    `title: ${script.title}`,
    `description: ${script.description}`,
  ];

  if (script.params.length > 0) {
    lines.push(`params: ${script.params.join(', ')}`);
  }

  lines.push('---');
  return lines.join('\n');
}

/**
 * Save script to our KB
 */
function saveScript(script: ParsedScript, relativePath: string) {
  const ext = script.language === 'jxa' ? '.jxa' : '.applescript';

  // Build file path
  const dir = pathDirname(relativePath);
  const categoryDir = join(KB_TARGET_PATH, dir);
  mkdirSync(categoryDir, { recursive: true });

  // Generate filename from script name
  const filename = relativePath.split('/').pop()!.replace('.md', ext);
  const filePath = join(categoryDir, filename);

  // Generate content
  const content = `${generateFrontmatter(script)}\n${script.code}\n`;

  writeFileSync(filePath, content, 'utf8');
  console.log(`  ✅ ${dir}/${filename}`);
  stats.converted++;
}

/**
 * Process a directory recursively
 */
function processDirectory(dirPath: string, relativePath: string = '') {
  const entries = readdirSync(dirPath);

  for (const entry of entries) {
    if (entry.startsWith('_')) continue; // Skip _shared_handlers, _category_info
    if (entry === '.DS_Store') continue;

    const fullPath = join(dirPath, entry);
    const stat = statSync(fullPath);
    const relPath = relativePath ? `${relativePath}/${entry}` : entry;

    if (stat.isDirectory()) {
      processDirectory(fullPath, relPath);
    } else if (entry.endsWith('.md')) {
      stats.fetched++;
      const content = readFileSync(fullPath, 'utf8');
      const script = parseScript(content, entry);

      if (script) {
        saveScript(script, relPath);
      } else {
        stats.skipped++;
      }
    }
  }
}

/**
 * Main import function
 */
function main() {
  console.log('🚀 Starting local import from /tmp/macos-automator-mcp\n');

  // Categories to import
  const categories = [
    '01_intro',
    '02_as_core',
    '03_jxa_core',
    '04_system',
    '05_files',
    '06_terminal',
    '07_browsers',
    '08_editors',
    '09_productivity',
    '10_creative',
    '11_advanced',
    '12_network',
    '13_developer',
  ];

  // Process each category
  for (const category of categories) {
    console.log(`\n📁 ${category}`);
    const sourcePath = join(KB_SOURCE_PATH, category);

    try {
      processDirectory(sourcePath, category);
    } catch (error) {
      console.error(`❌ Error processing category ${category}:`, error);
      stats.errors++;
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Import Summary:');
  console.log('='.repeat(60));
  console.log(`Files fetched:     ${stats.fetched}`);
  console.log(`Scripts converted: ${stats.converted}`);
  console.log(`Scripts skipped:   ${stats.skipped}`);
  console.log(`Errors:            ${stats.errors}`);
  console.log('='.repeat(60));

  if (stats.converted > 0) {
    console.log(`\n✅ Successfully imported ${stats.converted} scripts!`);
    console.log(`📂 Saved to: ${KB_TARGET_PATH}`);
  }

  if (stats.errors > 0) {
    console.log(`\n⚠️  ${stats.errors} errors occurred during import`);
  }
}

main();
