#!/usr/bin/env tsx
/**
 * Import steipete/macos-automator-mcp knowledge base
 * Converts from their format to our format with zero MCP dependencies
 */

import { writeFileSync, mkdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';

const GITHUB_REPO = 'steipete/macos-automator-mcp';
const GITHUB_BRANCH = 'main';
const KB_SOURCE_PATH = 'knowledge_base';
const KB_TARGET_PATH = join(process.cwd(), 'src/runtime/tools/implementations/macos_control/kb');

interface GitHubFile {
  name: string;
  path: string;
  type: 'file' | 'dir';
  download_url?: string;
  sha: string;
}

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
 * Fetch directory contents from GitHub
 */
async function fetchGitHubDirectory(path: string): Promise<GitHubFile[]> {
  const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}?ref=${GITHUB_BRANCH}`;
  console.log(`Fetching: ${path}`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Fetch file content from GitHub
 */
async function fetchFileContent(downloadUrl: string): Promise<string> {
  const response = await fetch(downloadUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch file: ${response.statusText}`);
  }
  return await response.text();
}

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
function saveScript(script: ParsedScript, category: string) {
  const ext = script.language === 'jxa' ? '.jxa' : '.applescript';

  // Build file path
  const categoryDir = join(KB_TARGET_PATH, category);
  mkdirSync(categoryDir, { recursive: true });

  // Generate filename from ID
  const filename = script.id.split('/').pop() + ext;
  const filePath = join(categoryDir, filename);

  // Generate content
  const content = `${generateFrontmatter(script)}\n${script.code}\n`;

  writeFileSync(filePath, content, 'utf8');
  console.log(`  ✅ Saved: ${category}/${filename}`);
  stats.converted++;
}

/**
 * Process a single file
 */
async function processFile(file: GitHubFile, category: string) {
  if (!file.download_url) return;
  if (!file.name.endsWith('.md')) return;
  if (file.name === '_category_info.md') return; // Skip category info

  try {
    const content = await fetchFileContent(file.download_url);
    stats.fetched++;

    const script = parseScript(content, file.name);
    if (script) {
      saveScript(script, category);
    } else {
      stats.skipped++;
    }
  } catch (error) {
    console.error(`  ❌ Error processing ${file.name}:`, error);
    stats.errors++;
  }
}

/**
 * Process a directory recursively
 */
async function processDirectory(path: string, category: string) {
  const files = await fetchGitHubDirectory(path);

  for (const file of files) {
    if (file.type === 'file' && file.name.endsWith('.md')) {
      await processFile(file, category);
    } else if (file.type === 'dir' && !file.name.startsWith('_')) {
      // Recurse into subdirectories (but skip _shared_handlers, etc.)
      const subCategory = `${category}/${file.name}`;
      await processDirectory(file.path, subCategory);
    }
  }
}

/**
 * Fetch and parse shared handlers
 */
async function fetchSharedHandlers(): Promise<Map<string, string>> {
  const handlers = new Map<string, string>();

  try {
    const path = `${KB_SOURCE_PATH}/_shared_handlers`;
    const files = await fetchGitHubDirectory(path);

    for (const file of files) {
      if (file.type === 'file' && file.name.endsWith('.applescript') && file.download_url) {
        const content = await fetchFileContent(file.download_url);
        handlers.set(file.name, content);
        console.log(`  📦 Loaded shared handler: ${file.name}`);
      }
    }
  } catch (error) {
    console.warn('⚠️  Could not fetch shared handlers (will skip inlining)');
  }

  return handlers;
}

/**
 * Main import function
 */
async function main() {
  console.log('🚀 Starting import from steipete/macos-automator-mcp\n');

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

  // Fetch shared handlers
  console.log('📦 Fetching shared handlers...\n');
  const sharedHandlers = await fetchSharedHandlers();
  console.log('');

  // Process each category
  for (const category of categories) {
    console.log(`\n📁 Processing category: ${category}`);
    const sourcePath = `${KB_SOURCE_PATH}/${category}`;

    try {
      await processDirectory(sourcePath, category);
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
    process.exit(1);
  }
}

main().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
