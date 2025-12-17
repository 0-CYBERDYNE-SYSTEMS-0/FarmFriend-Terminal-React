import fs from "node:fs";
import path from "node:path";
import type { Command, CommandFrontmatter } from "./types.js";
import { parseFrontmatter } from "./parser.js";

/**
 * Recursively find all .md files in a directory
 */
function findMarkdownFiles(dir: string, prefix = ""): string[] {
  const files: string[] = [];

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        files.push(...findMarkdownFiles(fullPath, relPath));
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        files.push(relPath);
      }
    }
  } catch (err) {
    console.error(`Failed to read directory ${dir}:`, err);
  }

  return files;
}

/**
 * Load all commands from workspace commands directory
 * Recursively searches for .md files and converts to command slugs
 * Example: commands/review.md → "review"
 *          commands/git/commit.md → "git:commit"
 */
export function loadCommands(workspaceDir: string): Map<string, Command> {
  const commandsDir = path.join(workspaceDir, "commands");

  if (!fs.existsSync(commandsDir)) {
    return new Map();
  }

  const commands = new Map<string, Command>();

  try {
    // Find all .md files recursively
    const files = findMarkdownFiles(commandsDir);

    for (const file of files) {
      try {
        const filePath = path.join(commandsDir, file);
        const content = fs.readFileSync(filePath, "utf8");

        // Parse frontmatter and body
        const { frontmatter, body } = parseFrontmatter(content);
        const fm = frontmatter as CommandFrontmatter;

        // Convert file path to slug
        // commands/review.md → "review"
        // commands/git/commit.md → "git:commit"
        const slug = file
          .replace(/\.md$/, "")
          .replace(/\\/g, "/") // Windows compatibility
          .split("/")
          .join(":");

        const stats = fs.statSync(filePath);

        const command: Command = {
          slug,
          filePath: file,
          description: fm.description || "",
          allowedTools: fm["allowed-tools"],
          model: fm.model,
          argumentHint: fm["argument-hint"],
          aliases: fm.aliases,
          template: body.trim(),
          createdAt: new Date(stats.birthtime).toISOString(),
          updatedAt: new Date(stats.mtime).toISOString()
        };

        commands.set(slug, command);

        // Also register aliases
        if (command.aliases) {
          for (const alias of command.aliases) {
            commands.set(alias.toLowerCase(), command);
          }
        }
      } catch (err) {
        console.error(`Failed to load command ${file}:`, err);
      }
    }
  } catch (err) {
    console.error(`Failed to load commands from ${commandsDir}:`, err);
  }

  return commands;
}

/**
 * Get command by slug or alias
 */
export function getCommand(
  commands: Map<string, Command>,
  slug: string
): Command | undefined {
  return commands.get(slug.toLowerCase());
}

/**
 * List all commands sorted by slug
 */
export function listCommands(commands: Map<string, Command>): Command[] {
  const seen = new Set<string>();
  const unique: Command[] = [];

  for (const cmd of commands.values()) {
    if (!seen.has(cmd.slug)) {
      seen.add(cmd.slug);
      unique.push(cmd);
    }
  }

  return unique.sort((a, b) => a.slug.localeCompare(b.slug));
}

/**
 * Save command to file
 */
export function saveCommand(
  workspaceDir: string,
  slug: string,
  command: {
    description?: string;
    allowedTools?: string[];
    model?: string;
    argumentHint?: string;
    aliases?: string[];
    template: string;
  }
): { success: boolean; path: string; error?: string } {
  const commandsDir = path.join(workspaceDir, "commands");
  fs.mkdirSync(commandsDir, { recursive: true });

  try {
    // Convert slug back to path
    const filePath = path.join(commandsDir, slug.replace(/:/g, "/") + ".md");
    const dirName = path.dirname(filePath);
    fs.mkdirSync(dirName, { recursive: true });

    // Build frontmatter
    const frontmatter: string[] = ["---"];
    if (command.description) {
      frontmatter.push(`description: "${command.description}"`);
    }
    if (command.allowedTools?.length) {
      frontmatter.push(
        `allowed-tools: [${command.allowedTools.map((t) => `"${t}"`).join(", ")}]`
      );
    }
    if (command.model) {
      frontmatter.push(`model: ${command.model}`);
    }
    if (command.argumentHint) {
      frontmatter.push(`argument-hint: "${command.argumentHint}"`);
    }
    if (command.aliases?.length) {
      frontmatter.push(
        `aliases: [${command.aliases.map((a) => `"${a}"`).join(", ")}]`
      );
    }
    frontmatter.push("---");

    // Combine frontmatter and body
    const content = [frontmatter.join("\n"), "", command.template.trim(), ""].join(
      "\n"
    );

    fs.writeFileSync(filePath, content, "utf8");

    return { success: true, path: filePath };
  } catch (err) {
    return {
      success: false,
      path: "",
      error: err instanceof Error ? err.message : String(err)
    };
  }
}

/**
 * Delete command file
 */
export function deleteCommand(
  workspaceDir: string,
  slug: string
): { success: boolean; error?: string } {
  const commandsDir = path.join(workspaceDir, "commands");
  const filePath = path.join(commandsDir, slug.replace(/:/g, "/") + ".md");

  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err)
    };
  }
}
