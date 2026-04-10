#!/usr/bin/env node

// ─────────────────────────────────────────────────────────
// doso — AI skills and prompt optimization from your terminal
// https://doso.dev
//
// Zero dependencies. Fast startup. Beautiful output.
// ─────────────────────────────────────────────────────────

import { resolve, basename, extname, join, dirname } from 'node:path';
import { readFile, writeFile, access } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// ── Arg parser ────────────────────────────────────────────

function parseArgs(argv) {
  const args = argv.slice(2);
  const command = args[0] && !args[0].startsWith('-') ? args[0] : null;
  const positional = [];
  const flags = {};

  let i = command ? 1 : 0;
  while (i < args.length) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const eqIndex = key.indexOf('=');
      if (eqIndex !== -1) {
        flags[key.slice(0, eqIndex)] = key.slice(eqIndex + 1);
      } else if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
        flags[key] = args[i + 1];
        i++;
      } else {
        flags[key] = true;
      }
    } else if (arg.startsWith('-') && arg.length === 2) {
      const key = arg.slice(1);
      if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
        flags[key] = args[i + 1];
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(arg);
    }
    i++;
  }

  return { command, positional, flags };
}

// ── Lazy imports (fast startup) ───────────────────────────

async function getDisplay() {
  return import('../lib/display.js');
}

async function getScanner() {
  return import('../lib/scanner.js');
}

async function getApi() {
  return import('../lib/api.js');
}

async function getServer() {
  return import('../lib/server.js');
}

// ── Git helpers ───────────────────────────────────────────

function detectGitRemote(dir) {
  try {
    const gitConfig = join(dir, '.git', 'config');
    if (!existsSync(gitConfig)) return null;

    const content = readFileSync(gitConfig, 'utf-8');
    const urlMatch = content.match(/url\s*=\s*(.+)/);
    if (!urlMatch) return null;

    let url = urlMatch[1].trim();
    // Convert SSH to HTTPS
    if (url.startsWith('git@')) {
      url = url.replace(/^git@([^:]+):/, 'https://$1/').replace(/\.git$/, '');
    } else if (url.endsWith('.git')) {
      url = url.replace(/\.git$/, '');
    }
    return url;
  } catch {
    return null;
  }
}

function detectCurrentBranch(dir) {
  try {
    const headFile = join(dir, '.git', 'HEAD');
    if (!existsSync(headFile)) return null;
    const content = readFileSync(headFile, 'utf-8').trim();
    const match = content.match(/^ref: refs\/heads\/(.+)$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

// ── COMMANDS ──────────────────────────────────────────────

// ── doso scan ─────────────────────────────────────────────

async function cmdScan(positional, flags) {
  const d = await getDisplay();
  const { scan, buildFileTree, estimateTokens } = await getScanner();

  const targetPath = resolve(positional[0] || '.');

  // Check path exists
  try {
    await access(targetPath);
  } catch {
    d.error(`Directory not found: ${targetPath}`);
    console.log(`  ${d.gray('Make sure the path exists and try again.')}\n`);
    process.exit(1);
  }

  const sp = d.spinner('Scanning for skills and prompts...');

  const results = await scan(targetPath);

  sp.stop(`Scan complete — ${d.bold(String(results.summary.totalFiles))} files checked`);

  // JSON output
  if (flags.json) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  // Pretty output
  console.log('');
  console.log(d.heading('Discovered Files'));
  console.log('');

  if (results.skills.length === 0 && results.prompts.length === 0) {
    console.log(`  ${d.gray('No skill files or embedded prompts found.')}`);
    console.log(`  ${d.gray('Create a .md file to define a skill, or look in a different directory.')}\n`);
    return;
  }

  // File tree
  const treeItems = buildFileTree(results.skills, results.prompts);
  console.log(d.tree(treeItems));

  // Skills detail
  if (results.skills.length > 0) {
    console.log('');
    console.log(d.heading('Skill Files'));
    console.log('');

    const rows = results.skills.map(s => [
      d.yellow(s.name),
      s.title,
      d.gray(`${s.wordCount} words`),
      d.gray(`~${estimateTokens(readFileSync(s.fullPath, 'utf-8'))} tokens`),
    ]);

    console.log(d.table(['File', 'Title', 'Words', 'Est. Tokens'], rows));
  }

  // Embedded prompts detail
  if (results.prompts.length > 0) {
    console.log('');
    console.log(d.heading('Embedded Prompts'));
    console.log('');

    for (const file of results.prompts) {
      const aiTag = file.hasAiImport ? d.cyan(' [AI SDK]') : '';
      console.log(`  ${d.bold(file.path)}${aiTag}`);
      for (const match of file.matches) {
        const typeLabel = match.type === 'variable'
          ? d.yellow(match.name || 'variable')
          : d.gray('inline prompt');
        console.log(`    ${d.gray('line ' + match.line + ':')} ${typeLabel}`);
        if (match.preview) {
          console.log(`    ${d.gray('  "' + match.preview.slice(0, 80) + '"')}`);
        }
      }
      console.log('');
    }
  }

  // Summary
  console.log(d.heading('Summary'));
  console.log('');
  console.log(d.keyValue([
    ['Skill files (.md)', d.boldYellow(String(results.skills.length))],
    ['Embedded prompts', d.boldYellow(String(results.prompts.length))],
    ['Total files scanned', d.gray(String(results.summary.totalFiles))],
    ['Directories skipped', d.gray(String(results.summary.skippedDirs))],
  ]));

  if (results.errors.length > 0) {
    console.log('');
    console.log(`  ${d.red(`${results.errors.length} error(s) during scan`)}`);
    for (const err of results.errors.slice(0, 5)) {
      console.log(`  ${d.gray('  ' + err.path + ': ' + err.message)}`);
    }
  }

  console.log('');
}

// ── doso connect ──────────────────────────────────────────

async function cmdConnect(positional, flags) {
  const d = await getDisplay();
  const api = await getApi();

  let repoUrl = positional[0] || null;

  // Auto-detect from git if no URL provided
  if (!repoUrl) {
    repoUrl = detectGitRemote(process.cwd());
    if (!repoUrl) {
      d.error('No Git repository detected in current directory.');
      console.log(`  ${d.gray('Provide a repo URL:')} ${d.bold('doso connect https://github.com/user/repo')}`);
      console.log(`  ${d.gray('Or run from a directory with a .git folder.')}\n`);
      process.exit(1);
    }
    d.info(`Detected repository: ${d.cyan(repoUrl)}`);
  }

  const token = flags.token || null;
  const branch = flags.branch || null;

  const sp = d.spinner(`Connecting ${repoUrl} to doso.dev...`);

  try {
    const result = await api.scanRepo(repoUrl, { token, branch });
    sp.stop('Repository connected!');

    const data = result.data;
    console.log('');
    console.log(d.heading('Connected Repository'));
    console.log('');
    console.log(d.keyValue([
      ['Repository', d.cyan(repoUrl)],
      ['Branch', d.bold(branch || data.branch || 'main')],
      ['Skills found', d.boldYellow(String(data.skills?.length || 0))],
    ]));

    if (data.skills && data.skills.length > 0) {
      console.log('');
      console.log(d.heading('Discovered Skills'));
      console.log('');
      const rows = data.skills.map(s => [
        d.yellow(s.name || s.path),
        s.title || d.gray('—'),
        d.gray(s.wordCount ? `${s.wordCount} words` : '—'),
      ]);
      console.log(d.table(['Name', 'Title', 'Size'], rows));
    }

    if (data.url) {
      console.log('');
      console.log(`  ${d.gray('View on doso.dev:')} ${d.cyan(data.url)}`);
    }

    console.log('');
  } catch (err) {
    sp.fail('Failed to connect repository');
    d.error(err.message);
    if (err.statusCode === 401) {
      console.log(`  ${d.gray('Authenticate with:')} ${d.bold('doso connect --token YOUR_GITHUB_PAT')}`);
      console.log(`  ${d.gray('Or set:')} ${d.bold('export DOSO_TOKEN=your_token')}\n`);
    } else {
      console.log(`  ${d.gray('Check that doso.dev is reachable and your URL is correct.')}\n`);
    }
    process.exit(1);
  }
}

// ── doso optimize ─────────────────────────────────────────

async function cmdOptimize(positional, flags) {
  const d = await getDisplay();
  const api = await getApi();
  const { estimateTokens } = await getScanner();

  const filePath = positional[0];
  if (!filePath) {
    d.error('Missing file argument.');
    console.log(`  ${d.gray('Usage:')} ${d.bold('doso optimize <file>')}`);
    console.log(`  ${d.gray('Example:')} ${d.bold('doso optimize prompts/system.md')}\n`);
    process.exit(1);
  }

  const fullPath = resolve(filePath);
  let content;

  try {
    content = await readFile(fullPath, 'utf-8');
  } catch {
    d.error(`File not found: ${fullPath}`);
    process.exit(1);
  }

  const model = flags.model || null;
  const applyChanges = flags.apply === true;
  const diffOnly = flags.diff === true;

  // Show current stats
  const tokenEstimate = estimateTokens(content);
  console.log('');
  console.log(d.heading(`Optimizing: ${basename(filePath)}`));
  console.log('');
  console.log(d.keyValue([
    ['File', d.bold(filePath)],
    ['Words', d.gray(String(content.split(/\s+/).filter(Boolean).length))],
    ['Est. tokens', d.yellow(String(tokenEstimate))],
    ['Target model', d.gray(model || 'default')],
  ]));
  console.log('');

  const sp = d.spinner('Analyzing skill with Claude...');

  try {
    const result = await api.optimizeSkill(content, { model });
    sp.stop('Analysis complete');

    const data = result.data;

    // Contradictions
    if (data.contradictions && data.contradictions.length > 0) {
      console.log('');
      console.log(d.heading('Contradictions'));
      console.log('');
      for (const c of data.contradictions) {
        console.log(`  ${d.yellow('⚠')} ${d.yellow(c.description || c)}`);
        if (c.lines) {
          console.log(`    ${d.gray(`Lines: ${c.lines}`)}`);
        }
        if (c.suggestion) {
          console.log(`    ${d.gray(`Fix: ${c.suggestion}`)}`);
        }
      }
    }

    // Suggestions
    if (data.suggestions && data.suggestions.length > 0) {
      console.log('');
      console.log(d.heading('Optimization Suggestions'));
      console.log('');
      for (let i = 0; i < data.suggestions.length; i++) {
        const s = data.suggestions[i];
        console.log(`  ${d.bold(String(i + 1) + '.')} ${s.title || s.description || s}`);
        if (s.impact) {
          console.log(`     ${d.gray('Impact:')} ${s.impact}`);
        }
        if (s.before && s.after) {
          console.log(`     ${d.gray('Before:')} ${d.red(s.before.slice(0, 80))}`);
          console.log(`     ${d.gray('After:')}  ${d.green(s.after.slice(0, 80))}`);
        }
      }
    }

    // Token estimate
    if (data.optimizedContent) {
      const newTokens = estimateTokens(data.optimizedContent);
      const saved = tokenEstimate - newTokens;
      console.log('');
      console.log(d.heading('Token Impact'));
      console.log('');
      console.log(d.keyValue([
        ['Before', d.yellow(String(tokenEstimate) + ' tokens')],
        ['After', d.green(String(newTokens) + ' tokens')],
        ['Saved', saved > 0 ? d.boldGreen(`${saved} tokens (${Math.round(saved/tokenEstimate*100)}%)`) : d.gray('0 tokens')],
      ]));

      // Show diff
      if (diffOnly || (!applyChanges && data.optimizedContent !== content)) {
        console.log('');
        console.log(d.heading('Diff'));
        console.log('');
        console.log(d.diff(content, data.optimizedContent));
      }

      // Apply changes
      if (applyChanges) {
        await writeFile(fullPath, data.optimizedContent, 'utf-8');
        d.success(`Optimized version written to ${d.bold(filePath)}`);
      } else if (!diffOnly) {
        console.log('');
        console.log(`  ${d.gray('Apply changes:')} ${d.bold(`doso optimize ${filePath} --apply`)}`);
        console.log(`  ${d.gray('View diff:')}     ${d.bold(`doso optimize ${filePath} --diff`)}`);
      }
    }

    console.log('');
  } catch (err) {
    sp.fail('Optimization failed');
    d.error(err.message);
    if (err.statusCode === 401) {
      console.log(`  ${d.gray('Set your token:')} ${d.bold('export DOSO_TOKEN=your_token')}\n`);
    }
    process.exit(1);
  }
}

// ── doso serve ────────────────────────────────────────────

async function cmdServe(positional, flags) {
  const { startServer } = await getServer();

  const dir = resolve(positional[0] || '.');
  const port = parseInt(flags.port || flags.p || '4040', 10);

  if (isNaN(port) || port < 1 || port > 65535) {
    const d = await getDisplay();
    d.error(`Invalid port: ${flags.port}`);
    process.exit(1);
  }

  await startServer(dir, port);
}

// ── doso push ─────────────────────────────────────────────

async function cmdPush(positional, flags) {
  const d = await getDisplay();
  const api = await getApi();

  const filePath = positional[0];
  if (!filePath) {
    d.error('Missing file argument.');
    console.log(`  ${d.gray('Usage:')} ${d.bold('doso push <file>')}`);
    console.log(`  ${d.gray('Example:')} ${d.bold('doso push skills/system-prompt.md')}\n`);
    process.exit(1);
  }

  const fullPath = resolve(filePath);
  let content;

  try {
    content = await readFile(fullPath, 'utf-8');
  } catch {
    d.error(`File not found: ${fullPath}`);
    process.exit(1);
  }

  const name = basename(filePath, extname(filePath));
  const sp = d.spinner(`Pushing ${d.bold(basename(filePath))} to doso.dev...`);

  try {
    const result = await api.pushSkill(name, content);
    sp.stop(`Pushed ${d.bold(name)} successfully`);

    const data = result.data;
    console.log('');
    console.log(d.heading('Skill Published'));
    console.log('');
    console.log(d.keyValue([
      ['Name', d.boldYellow(name)],
      ['File', d.gray(filePath)],
      ['Words', d.gray(String(content.split(/\s+/).filter(Boolean).length))],
    ]));

    if (data.url) {
      console.log('');
      console.log(`  ${d.gray('View:')}     ${d.cyan(data.url)}`);
    }
    if (data.endpoint) {
      console.log(`  ${d.gray('Endpoint:')} ${d.cyan(data.endpoint)}`);
    }
    if (data.rawEndpoint) {
      console.log(`  ${d.gray('Raw:')}      ${d.cyan(data.rawEndpoint)}`);
    }

    console.log('');
  } catch (err) {
    sp.fail('Push failed');
    d.error(err.message);
    if (err.statusCode === 401) {
      console.log(`  ${d.gray('Set your token:')} ${d.bold('export DOSO_TOKEN=your_token')}\n`);
    }
    process.exit(1);
  }
}

// ── doso pull ─────────────────────────────────────────────

async function cmdPull(positional, flags) {
  const d = await getDisplay();
  const api = await getApi();

  const skillId = positional[0];
  if (!skillId) {
    d.error('Missing skill ID.');
    console.log(`  ${d.gray('Usage:')} ${d.bold('doso pull <skill-id>')}`);
    console.log(`  ${d.gray('Example:')} ${d.bold('doso pull my-system-prompt')}\n`);
    process.exit(1);
  }

  const sp = d.spinner(`Pulling skill ${d.bold(skillId)} from doso.dev...`);

  try {
    const result = await api.pullSkill(skillId);
    sp.stop(`Pulled ${d.bold(skillId)}`);

    const data = result.data;
    const content = data.content;
    const outputFile = flags.output || flags.o || `${skillId}.md`;

    await writeFile(outputFile, content, 'utf-8');

    console.log('');
    console.log(d.heading('Skill Downloaded'));
    console.log('');
    console.log(d.keyValue([
      ['Skill', d.boldYellow(skillId)],
      ['Title', d.bold(data.title || skillId)],
      ['Saved to', d.cyan(outputFile)],
      ['Words', d.gray(String(content.split(/\s+/).filter(Boolean).length))],
    ]));
    console.log('');
  } catch (err) {
    sp.fail('Pull failed');
    d.error(err.message);
    if (err.statusCode === 404) {
      console.log(`  ${d.gray('Skill not found. List available skills with:')} ${d.bold('doso status')}\n`);
    } else if (err.statusCode === 401) {
      console.log(`  ${d.gray('Set your token:')} ${d.bold('export DOSO_TOKEN=your_token')}\n`);
    }
    process.exit(1);
  }
}

// ── doso diff ─────────────────────────────────────────────

async function cmdDiff(positional, flags) {
  const d = await getDisplay();
  const api = await getApi();

  const filePath = positional[0];
  if (!filePath) {
    d.error('Missing file argument.');
    console.log(`  ${d.gray('Usage:')} ${d.bold('doso diff <file>')}`);
    console.log(`  ${d.gray('Example:')} ${d.bold('doso diff skills/system-prompt.md')}\n`);
    process.exit(1);
  }

  const fullPath = resolve(filePath);
  let localContent;

  try {
    localContent = await readFile(fullPath, 'utf-8');
  } catch {
    d.error(`File not found: ${fullPath}`);
    process.exit(1);
  }

  const name = basename(filePath, extname(filePath));
  const sp = d.spinner(`Comparing ${d.bold(basename(filePath))} with hosted version...`);

  try {
    const result = await api.getSkillDiff(name, localContent);
    sp.stop('Comparison complete');

    const data = result.data;
    console.log('');
    console.log(d.heading(`Diff: ${basename(filePath)}`));
    console.log('');

    if (data.identical) {
      d.success('Local and hosted versions are identical.');
    } else {
      if (data.remoteContent) {
        console.log(d.diff(data.remoteContent, localContent));
      } else if (data.diff) {
        console.log(data.diff);
      } else {
        console.log(`  ${d.gray('Local:')}  ${d.gray(localContent.split(/\s+/).filter(Boolean).length + ' words')}`);
        console.log(`  ${d.gray('Remote:')} ${d.gray((data.remoteWordCount || '?') + ' words')}`);
        console.log('');
        console.log(`  ${d.yellow('Files differ. Use')} ${d.bold('doso push')} ${d.yellow('to sync local → remote.')}`);
      }
    }

    console.log('');
  } catch (err) {
    sp.fail('Diff failed');
    d.error(err.message);
    if (err.statusCode === 404) {
      console.log(`  ${d.gray('Skill not found on doso.dev. Push it first:')} ${d.bold(`doso push ${filePath}`)}\n`);
    } else if (err.statusCode === 401) {
      console.log(`  ${d.gray('Set your token:')} ${d.bold('export DOSO_TOKEN=your_token')}\n`);
    }
    process.exit(1);
  }
}

// ── doso status ───────────────────────────────────────────

async function cmdStatus(positional, flags) {
  const d = await getDisplay();
  const api = await getApi();
  const { scan } = await getScanner();

  // Local info
  const cwd = process.cwd();
  const repoUrl = detectGitRemote(cwd);
  const branch = detectCurrentBranch(cwd);

  console.log('');
  console.log(d.heading('Project Status'));
  console.log('');

  // Local scan
  const localResults = await scan(cwd);

  console.log(d.keyValue([
    ['Directory', d.bold(cwd)],
    ['Repository', repoUrl ? d.cyan(repoUrl) : d.gray('not connected')],
    ['Branch', branch ? d.bold(branch) : d.gray('unknown')],
    ['Local skills', d.boldYellow(String(localResults.skills.length))],
    ['Embedded prompts', d.yellow(String(localResults.prompts.length))],
  ]));

  // Try to get remote status
  const token = await api.getToken();
  if (token) {
    console.log('');
    const sp = d.spinner('Fetching remote status...');

    try {
      const result = await api.getProjectStatus();
      sp.stop('Remote status loaded');

      const data = result.data;
      console.log('');
      console.log(d.heading('Remote Status'));
      console.log('');
      console.log(d.keyValue([
        ['Hosted skills', d.boldYellow(String(data.skillCount || 0))],
        ['Health score', data.healthScore ? d.boldGreen(data.healthScore + '/100') : d.gray('—')],
        ['Last synced', data.lastSync ? d.gray(data.lastSync) : d.gray('never')],
      ]));

      if (data.pendingSuggestions && data.pendingSuggestions > 0) {
        console.log('');
        d.warn(`${data.pendingSuggestions} pending optimization suggestion(s)`);
        console.log(`  ${d.gray('Run')} ${d.bold('doso optimize <file>')} ${d.gray('to view')}`);
      }
    } catch (err) {
      sp.fail('Could not fetch remote status');
      console.log(`  ${d.gray(err.message)}`);
    }
  } else {
    console.log('');
    console.log(`  ${d.gray('Not authenticated. Set')} ${d.bold('DOSO_TOKEN')} ${d.gray('for remote features.')}`);
  }

  console.log('');
}

// ── doso help ─────────────────────────────────────────────

async function cmdHelp() {
  const d = await getDisplay();

  console.log(d.banner());
  console.log(d.boldWhite('  Usage:') + d.gray('  doso <command> [options]'));
  console.log('');
  console.log(d.boldWhite('  Commands:'));
  console.log('');

  const commands = [
    ['scan [path]',     'Scan directory for skills and embedded prompts'],
    ['connect [url]',   'Connect a GitHub repo to doso.dev'],
    ['optimize <file>', 'Analyze and optimize a skill file with AI'],
    ['serve [path]',    'Start a local skill server'],
    ['push <file>',     'Push a local skill to doso.dev'],
    ['pull <skill-id>', 'Pull a hosted skill to local file'],
    ['diff <file>',     'Diff local vs hosted version of a skill'],
    ['status',          'Show project and connection status'],
  ];

  for (const [cmd, desc] of commands) {
    const paddedCmd = cmd.padEnd(20);
    console.log(`    ${d.yellow(paddedCmd)} ${d.gray(desc)}`);
  }

  console.log('');
  console.log(d.boldWhite('  Scan options:'));
  console.log(`    ${d.gray('--json')}               ${d.gray('Output results as JSON')}`);
  console.log('');
  console.log(d.boldWhite('  Connect options:'));
  console.log(`    ${d.gray('--token <pat>')}        ${d.gray('GitHub personal access token')}`);
  console.log(`    ${d.gray('--branch <name>')}      ${d.gray('Branch to scan (default: main)')}`);
  console.log('');
  console.log(d.boldWhite('  Optimize options:'));
  console.log(`    ${d.gray('--model <model>')}      ${d.gray('Target model for optimization')}`);
  console.log(`    ${d.gray('--apply')}              ${d.gray('Write optimized version back to file')}`);
  console.log(`    ${d.gray('--diff')}               ${d.gray('Show diff only, don\'t apply')}`);
  console.log('');
  console.log(d.boldWhite('  Serve options:'));
  console.log(`    ${d.gray('--port <number>')}      ${d.gray('Port to listen on (default: 4040)')}`);
  console.log('');
  console.log(d.boldWhite('  Pull options:'));
  console.log(`    ${d.gray('--output <file>')}      ${d.gray('Output filename (default: <skill-id>.md)')}`);
  console.log('');
  console.log(d.boldWhite('  Environment:'));
  console.log(`    ${d.gray('DOSO_TOKEN')}           ${d.gray('Authentication token for doso.dev')}`);
  console.log(`    ${d.gray('DOSO_API_URL')}         ${d.gray('API base URL (default: https://app.doso.dev)')}`);
  console.log('');
  console.log(d.boldWhite('  Examples:'));
  console.log(`    ${d.gray('$')} ${d.bold('doso scan')}                             ${d.gray('Scan current directory')}`);
  console.log(`    ${d.gray('$')} ${d.bold('doso scan ./prompts --json')}            ${d.gray('Scan with JSON output')}`);
  console.log(`    ${d.gray('$')} ${d.bold('doso connect')}                          ${d.gray('Auto-detect and connect repo')}`);
  console.log(`    ${d.gray('$')} ${d.bold('doso optimize system.md --diff')}        ${d.gray('Preview optimizations')}`);
  console.log(`    ${d.gray('$')} ${d.bold('doso serve --port 3000')}                ${d.gray('Serve skills on port 3000')}`);
  console.log(`    ${d.gray('$')} ${d.bold('doso push skills/assistant.md')}         ${d.gray('Publish a skill')}`);
  console.log(`    ${d.gray('$')} ${d.bold('doso pull my-skill')}                    ${d.gray('Download a skill')}`);
  console.log('');
  console.log(`  ${d.gray('Learn more:')} ${d.cyan('https://doso.dev/docs/cli')}`);
  console.log('');
}

// ── Command router ────────────────────────────────────────

async function main() {
  const { command, positional, flags } = parseArgs(process.argv);

  // Version flag
  if (flags.version || flags.v) {
    console.log('doso 0.1.0');
    return;
  }

  // Help flag on any command
  if (flags.help || flags.h) {
    await cmdHelp();
    return;
  }

  // Route commands
  switch (command) {
    case 'scan':
      await cmdScan(positional, flags);
      break;

    case 'connect':
      await cmdConnect(positional, flags);
      break;

    case 'optimize':
      await cmdOptimize(positional, flags);
      break;

    case 'serve':
      await cmdServe(positional, flags);
      break;

    case 'push':
      await cmdPush(positional, flags);
      break;

    case 'pull':
      await cmdPull(positional, flags);
      break;

    case 'diff':
      await cmdDiff(positional, flags);
      break;

    case 'status':
      await cmdStatus(positional, flags);
      break;

    case 'help':
      await cmdHelp();
      break;

    case null:
    case undefined:
      await cmdHelp();
      break;

    default: {
      const d = await getDisplay();
      d.error(`Unknown command: ${d.bold(command)}`);
      console.log(`  ${d.gray('Run')} ${d.bold('doso help')} ${d.gray('to see available commands.')}\n`);

      // Suggest closest match
      const commands = ['scan', 'connect', 'optimize', 'serve', 'push', 'pull', 'diff', 'status'];
      const suggestion = commands.find(c => c.startsWith(command.slice(0, 2)));
      if (suggestion) {
        console.log(`  ${d.gray('Did you mean')} ${d.bold(`doso ${suggestion}`)}${d.gray('?')}\n`);
      }
      process.exit(1);
    }
  }
}

// ── Run ───────────────────────────────────────────────────

main().catch(async (err) => {
  const d = await getDisplay();
  d.error(`Unexpected error: ${err.message}`);
  if (process.env.DEBUG) {
    console.error(err.stack);
  }
  console.log(`  ${d.gray('Set DEBUG=1 for stack trace.')}\n`);
  process.exit(1);
});
