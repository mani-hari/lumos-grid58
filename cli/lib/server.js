// ─────────────────────────────────────────────────────────
// server.js — Local skill server for `doso serve`
// Bare Node.js HTTP server. No Express. Zero dependencies.
// ─────────────────────────────────────────────────────────

import http from 'node:http';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, extname, basename } from 'node:path';
import {
  bold, boldWhite, boldYellow, cyan, gray, green, red, yellow,
  box, table, heading,
} from './display.js';

// ── Skill file discovery ──────────────────────────────────

async function discoverSkills(dir) {
  const skills = [];

  async function walk(currentDir) {
    let entries;
    try {
      entries = await readdir(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name);

      if (entry.isDirectory()) {
        // Skip hidden and build dirs
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
        await walk(fullPath);
        continue;
      }

      if (entry.name.endsWith('.md')) {
        const content = await readFile(fullPath, 'utf-8');
        const relativePath = fullPath.slice(dir.length + 1);
        const slug = relativePath
          .replace(/\.md$/, '')
          .replace(/[\\/]/g, '-')
          .replace(/[^a-zA-Z0-9-_]/g, '-')
          .toLowerCase();

        // Extract title
        let title = basename(entry.name, '.md');
        const headingMatch = content.match(/^#\s+(.+)$/m);
        if (headingMatch) title = headingMatch[1];

        skills.push({
          slug,
          title,
          path: relativePath,
          fullPath,
          content,
          wordCount: content.split(/\s+/).filter(Boolean).length,
        });
      }
    }
  }

  await walk(dir);
  skills.sort((a, b) => a.slug.localeCompare(b.slug));
  return skills;
}

// ── CORS headers ──────────────────────────────────────────

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// ── JSON response helper ──────────────────────────────────

function json(res, statusCode, data) {
  setCorsHeaders(res);
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data, null, 2));
}

// ── Text response helper ──────────────────────────────────

function text(res, statusCode, content) {
  setCorsHeaders(res);
  res.writeHead(statusCode, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(content);
}

// ── Start the server ──────────────────────────────────────

export async function startServer(dir, port = 4040) {
  const skills = await discoverSkills(dir);

  if (skills.length === 0) {
    console.log(`\n  ${red('No .md files found in')} ${bold(dir)}`);
    console.log(`  ${gray('Create some .md skill files and try again.')}\n`);
    process.exit(1);
  }

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`);
    const pathname = url.pathname;

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      setCorsHeaders(res);
      res.writeHead(204);
      res.end();
      return;
    }

    // Log request
    const timestamp = new Date().toLocaleTimeString();
    console.log(`  ${gray(timestamp)}  ${bold(req.method)} ${cyan(pathname)}`);

    // ── Routes ──────────────────────────────────────

    // GET / — Index
    if (pathname === '/' || pathname === '/skills') {
      json(res, 200, {
        name: 'doso-skill-server',
        version: '0.1.0',
        skills: skills.map(s => ({
          slug: s.slug,
          title: s.title,
          path: s.path,
          wordCount: s.wordCount,
          endpoints: {
            json: `/skills/${s.slug}`,
            raw: `/skills/${s.slug}/raw`,
          },
        })),
      });
      return;
    }

    // GET /skills/:slug
    const skillJsonMatch = pathname.match(/^\/skills\/([a-zA-Z0-9_-]+)$/);
    if (skillJsonMatch) {
      const slug = skillJsonMatch[1];
      const skill = skills.find(s => s.slug === slug);
      if (!skill) {
        json(res, 404, { error: 'Skill not found', slug });
        return;
      }

      // Re-read the file for fresh content
      try {
        const content = await readFile(skill.fullPath, 'utf-8');
        json(res, 200, {
          slug: skill.slug,
          title: skill.title,
          path: skill.path,
          content,
          wordCount: content.split(/\s+/).filter(Boolean).length,
        });
      } catch (err) {
        json(res, 500, { error: 'Failed to read skill file', message: err.message });
      }
      return;
    }

    // GET /skills/:slug/raw
    const skillRawMatch = pathname.match(/^\/skills\/([a-zA-Z0-9_-]+)\/raw$/);
    if (skillRawMatch) {
      const slug = skillRawMatch[1];
      const skill = skills.find(s => s.slug === slug);
      if (!skill) {
        text(res, 404, `Skill not found: ${slug}`);
        return;
      }

      try {
        const content = await readFile(skill.fullPath, 'utf-8');
        text(res, 200, content);
      } catch (err) {
        text(res, 500, `Failed to read skill file: ${err.message}`);
      }
      return;
    }

    // GET /health
    if (pathname === '/health') {
      json(res, 200, { status: 'ok', skills: skills.length });
      return;
    }

    // 404
    json(res, 404, {
      error: 'Not found',
      hint: 'Try GET /skills to list all available skills',
    });
  });

  return new Promise((resolve, reject) => {
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`\n  ${red('Port')} ${bold(String(port))} ${red('is already in use.')}`);
        console.error(`  ${gray('Try a different port:')} ${bold(`doso serve --port ${port + 1}`)}\n`);
        process.exit(1);
      }
      reject(err);
    });

    server.listen(port, () => {
      const base = `http://localhost:${port}`;

      // Print startup banner
      console.log('');
      console.log(heading('doso skill server'));
      console.log('');
      console.log(`  ${gray('Serving')}  ${bold(dir)}`);
      console.log(`  ${gray('Listen')}   ${cyan(base)}`);
      console.log(`  ${gray('Skills')}   ${boldYellow(String(skills.length))} ${gray('files loaded')}`);
      console.log('');

      // Endpoint table
      const rows = [];
      for (const skill of skills) {
        rows.push([
          yellow(skill.slug),
          cyan(`${base}/skills/${skill.slug}`),
          gray(`${skill.wordCount} words`),
        ]);
      }

      console.log(table(
        ['Skill', 'Endpoint', 'Size'],
        rows
      ));

      console.log('');
      console.log(`  ${gray('Raw text:')} ${cyan(`${base}/skills/{slug}/raw`)}`);
      console.log(`  ${gray('All skills:')} ${cyan(`${base}/skills`)}`);
      console.log('');
      console.log(`  ${gray('Press')} ${bold('Ctrl+C')} ${gray('to stop')}\n`);

      resolve(server);
    });
  });
}
