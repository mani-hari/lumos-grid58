// ─────────────────────────────────────────────────────────
// scanner.js — Local file scanner for skill/prompt files
// Walks directories, identifies .md skills and embedded prompts
// ─────────────────────────────────────────────────────────

import { readdir, stat, readFile } from 'node:fs/promises';
import { join, relative, extname, basename } from 'node:path';

// Directories to always skip
const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', '.nuxt',
  '.vercel', '.output', 'coverage', '__pycache__', '.cache',
  '.turbo', 'vendor', '.svn', '.hg',
]);

// Code file extensions we care about
const CODE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);

// Skill file extensions
const SKILL_EXTENSIONS = new Set(['.md']);

// ── Prompt detection patterns ─────────────────────────────

// Variable names that suggest prompt content
const PROMPT_VAR_PATTERNS = [
  /(?:const|let|var|export)\s+(?:(?:const|let|var)\s+)?(\w*(?:system[_-]?prompt|prompt[_-]?template|instructions|system[_-]?message|ai[_-]?prompt|llm[_-]?prompt|chat[_-]?prompt|base[_-]?prompt|user[_-]?prompt|assistant[_-]?prompt)\w*)\s*=/i,
  /(?:SYSTEM_PROMPT|PROMPT_TEMPLATE|INSTRUCTIONS|BASE_PROMPT|AI_PROMPT|LLM_PROMPT)\s*=/,
];

// String content that suggests prompt text
const PROMPT_CONTENT_PATTERNS = [
  /["'`](?:you are|you're a|as an ai|as a helpful|system:|# instructions|# system prompt|you will act|your role is|your task is|respond as|behave as)/i,
  /role:\s*["']system["']/i,
  /system:\s*["'`]/i,
];

// AI SDK imports
const AI_SDK_PATTERNS = [
  /from\s+["']@anthropic-ai\/sdk["']/,
  /from\s+["']openai["']/,
  /from\s+["']@ai-sdk/,
  /from\s+["']langchain/,
  /from\s+["']@langchain/,
  /require\s*\(\s*["']@anthropic-ai\/sdk["']\s*\)/,
  /require\s*\(\s*["']openai["']\s*\)/,
  /require\s*\(\s*["']langchain/,
];

// ── Main scan function ────────────────────────────────────

export async function scan(targetPath, options = {}) {
  const results = {
    skills: [],        // .md files
    prompts: [],       // code files with embedded prompts
    summary: {
      totalFiles: 0,
      skillFiles: 0,
      promptFiles: 0,
      skippedDirs: 0,
    },
    errors: [],
  };

  await walkDirectory(targetPath, targetPath, results, options);

  results.summary.skillFiles = results.skills.length;
  results.summary.promptFiles = results.prompts.length;

  return results;
}

// ── Directory walker ──────────────────────────────────────

async function walkDirectory(dir, rootPath, results, options) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (err) {
    results.errors.push({ path: dir, message: err.message });
    return;
  }

  // Sort entries: directories first, then files
  entries.sort((a, b) => {
    if (a.isDirectory() && !b.isDirectory()) return -1;
    if (!a.isDirectory() && b.isDirectory()) return 1;
    return a.name.localeCompare(b.name);
  });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) {
        results.summary.skippedDirs++;
        continue;
      }
      await walkDirectory(fullPath, rootPath, results, options);
      continue;
    }

    if (!entry.isFile()) continue;

    results.summary.totalFiles++;
    const ext = extname(entry.name).toLowerCase();
    const relPath = relative(rootPath, fullPath);

    // Skill files (.md)
    if (SKILL_EXTENSIONS.has(ext)) {
      try {
        const content = await readFile(fullPath, 'utf-8');
        const lines = content.split('\n');
        const title = extractTitle(content, entry.name);
        const wordCount = content.split(/\s+/).filter(Boolean).length;

        results.skills.push({
          path: relPath,
          fullPath,
          name: entry.name,
          title,
          lines: lines.length,
          wordCount,
          sizeBytes: Buffer.byteLength(content, 'utf-8'),
          hasYamlFrontmatter: content.startsWith('---'),
        });
      } catch (err) {
        results.errors.push({ path: relPath, message: err.message });
      }
      continue;
    }

    // Code files
    if (CODE_EXTENSIONS.has(ext)) {
      try {
        const content = await readFile(fullPath, 'utf-8');
        const promptMatches = findPromptPatterns(content, relPath);

        if (promptMatches.length > 0) {
          results.prompts.push({
            path: relPath,
            fullPath,
            name: entry.name,
            matches: promptMatches,
            hasAiImport: hasAiSdkImport(content),
          });
        }
      } catch (err) {
        results.errors.push({ path: relPath, message: err.message });
      }
    }
  }
}

// ── Helpers ───────────────────────────────────────────────

function extractTitle(content, filename) {
  // Try to get title from YAML frontmatter
  if (content.startsWith('---')) {
    const endIdx = content.indexOf('---', 3);
    if (endIdx !== -1) {
      const frontmatter = content.slice(3, endIdx);
      const titleMatch = frontmatter.match(/^title:\s*["']?(.+?)["']?\s*$/m);
      if (titleMatch) return titleMatch[1];
    }
  }

  // Try first heading
  const headingMatch = content.match(/^#\s+(.+)$/m);
  if (headingMatch) return headingMatch[1];

  // Fall back to filename
  return filename.replace(/\.md$/, '');
}

function findPromptPatterns(content, filePath) {
  const lines = content.split('\n');
  const matches = [];
  const seen = new Set();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Check variable name patterns
    for (const pattern of PROMPT_VAR_PATTERNS) {
      const match = line.match(pattern);
      if (match) {
        const key = `var:${lineNum}`;
        if (!seen.has(key)) {
          seen.add(key);
          const varName = match[1] || match[0].trim();
          // Try to extract the prompt value (look ahead a few lines)
          const context = lines.slice(i, Math.min(i + 10, lines.length)).join('\n');
          const preview = extractPromptPreview(context);
          matches.push({
            type: 'variable',
            line: lineNum,
            name: varName,
            preview,
            raw: line.trim(),
          });
        }
      }
    }

    // Check string content patterns
    for (const pattern of PROMPT_CONTENT_PATTERNS) {
      if (pattern.test(line)) {
        const key = `content:${lineNum}`;
        if (!seen.has(key)) {
          seen.add(key);
          matches.push({
            type: 'inline',
            line: lineNum,
            preview: line.trim().slice(0, 120),
            raw: line.trim(),
          });
        }
      }
    }
  }

  return matches;
}

function hasAiSdkImport(content) {
  return AI_SDK_PATTERNS.some(pattern => pattern.test(content));
}

function extractPromptPreview(context) {
  // Try to extract the string value from a variable assignment
  // Look for template literals, regular strings, etc.
  const templateMatch = context.match(/`([^`]{10,120})/);
  if (templateMatch) return templateMatch[1].trim().slice(0, 100) + '...';

  const doubleQuoteMatch = context.match(/"([^"]{10,120})/);
  if (doubleQuoteMatch) return doubleQuoteMatch[1].trim().slice(0, 100) + '...';

  const singleQuoteMatch = context.match(/'([^']{10,120})/);
  if (singleQuoteMatch) return singleQuoteMatch[1].trim().slice(0, 100) + '...';

  return null;
}

// ── Estimate tokens (rough heuristic) ─────────────────────

export function estimateTokens(text) {
  // Rough estimation: ~4 chars per token for English text
  // This is a simplified version — real tokenizers are more complex
  const chars = text.length;
  const words = text.split(/\s+/).filter(Boolean).length;
  // Average of char-based and word-based estimates
  return Math.round((chars / 4 + words * 1.3) / 2);
}

// ── Build tree structure for display ──────────────────────

export function buildFileTree(skills, prompts) {
  const tree = {};

  // Add skills
  for (const skill of skills) {
    addToTree(tree, skill.path, { type: 'skill', data: skill });
  }

  // Add prompts
  for (const prompt of prompts) {
    addToTree(tree, prompt.path, { type: 'prompt', data: prompt });
  }

  return treeToDisplayItems(tree, '');
}

function addToTree(tree, filePath, info) {
  const parts = filePath.split('/');
  let current = tree;

  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]]) {
      current[parts[i]] = { __children: {} };
    }
    current = current[parts[i]].__children || current[parts[i]];
  }

  current[parts[parts.length - 1]] = info;
}

function treeToDisplayItems(node, prefix) {
  const items = [];
  const keys = Object.keys(node).sort();

  for (const key of keys) {
    const value = node[key];
    if (value.__children) {
      // Directory
      items.push({
        name: `\x1b[1;37m${key}/\x1b[0m`,
        children: treeToDisplayItems(value.__children, prefix + key + '/'),
      });
    } else if (value.type === 'skill') {
      const d = value.data;
      items.push({
        name: `\x1b[33m${key}\x1b[0m \x1b[90m(${d.wordCount} words, ${d.lines} lines)\x1b[0m`,
      });
    } else if (value.type === 'prompt') {
      const d = value.data;
      const matchCount = d.matches.length;
      const importTag = d.hasAiImport ? ' \x1b[36m[AI SDK]\x1b[0m' : '';
      items.push({
        name: `\x1b[35m${key}\x1b[0m \x1b[90m(${matchCount} prompt${matchCount > 1 ? 's' : ''})\x1b[0m${importTag}`,
      });
    } else {
      items.push({ name: key });
    }
  }

  return items;
}
