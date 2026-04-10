// ─────────────────────────────────────────────────────────
// display.js — Terminal display utilities for doso CLI
// Zero dependencies. ANSI escape codes only.
// ─────────────────────────────────────────────────────────

const ESC = '\x1b[';
const RESET = `${ESC}0m`;

// ── Color helpers ─────────────────────────────────────────

export function bold(s)    { return `${ESC}1m${s}${RESET}`; }
export function dim(s)     { return `${ESC}2m${s}${RESET}`; }
export function italic(s)  { return `${ESC}3m${s}${RESET}`; }
export function underline(s) { return `${ESC}4m${s}${RESET}`; }
export function red(s)     { return `${ESC}31m${s}${RESET}`; }
export function green(s)   { return `${ESC}32m${s}${RESET}`; }
export function yellow(s)  { return `${ESC}33m${s}${RESET}`; }
export function blue(s)    { return `${ESC}34m${s}${RESET}`; }
export function magenta(s) { return `${ESC}35m${s}${RESET}`; }
export function cyan(s)    { return `${ESC}36m${s}${RESET}`; }
export function white(s)   { return `${ESC}37m${s}${RESET}`; }
export function gray(s)    { return `${ESC}90m${s}${RESET}`; }

export function boldWhite(s) { return `${ESC}1;37m${s}${RESET}`; }
export function boldYellow(s) { return `${ESC}1;33m${s}${RESET}`; }
export function boldGreen(s) { return `${ESC}1;32m${s}${RESET}`; }
export function boldRed(s) { return `${ESC}1;31m${s}${RESET}`; }
export function boldCyan(s) { return `${ESC}1;36m${s}${RESET}`; }

// Strip ANSI codes for width calculations
function stripAnsi(s) {
  return s.replace(/\x1b\[[0-9;]*m/g, '');
}

function visibleLength(s) {
  return stripAnsi(s).length;
}

// Pad a string to a target visible width
function padEnd(s, width) {
  const visible = visibleLength(s);
  if (visible >= width) return s;
  return s + ' '.repeat(width - visible);
}

// ── Box drawing ───────────────────────────────────────────

export function box(title, content, { width = 60, borderColor = gray } = {}) {
  const innerWidth = width - 2;
  const lines = content.split('\n');

  const top    = borderColor('┌') + borderColor('─'.repeat(innerWidth)) + borderColor('┐');
  const bottom = borderColor('└') + borderColor('─'.repeat(innerWidth)) + borderColor('┘');

  let titleBar = '';
  if (title) {
    const titleText = ` ${title} `;
    const titleLen = stripAnsi(titleText).length;
    const leftDash = Math.floor((innerWidth - titleLen) / 2);
    const rightDash = innerWidth - titleLen - leftDash;
    titleBar = borderColor('┌')
      + borderColor('─'.repeat(leftDash))
      + boldWhite(titleText)
      + borderColor('─'.repeat(rightDash))
      + borderColor('┐');
  }

  const output = [title ? titleBar : top];

  for (const line of lines) {
    const stripped = stripAnsi(line);
    const pad = innerWidth - stripped.length;
    if (pad < 0) {
      // Truncate very long lines
      output.push(borderColor('│') + line.slice(0, innerWidth) + borderColor('│'));
    } else {
      output.push(borderColor('│') + line + ' '.repeat(pad) + borderColor('│'));
    }
  }

  output.push(bottom);
  return output.join('\n');
}

// ── Tree view ─────────────────────────────────────────────

export function tree(items, { indent = '' } = {}) {
  const lines = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const isLast = i === items.length - 1;
    const connector = isLast ? '└── ' : '├── ';
    const childIndent = isLast ? '    ' : '│   ';

    if (typeof item === 'string') {
      lines.push(gray(indent + connector) + item);
    } else if (item && typeof item === 'object') {
      // { name, children?, icon? }
      const label = item.icon ? `${item.icon}  ${item.name}` : item.name;
      lines.push(gray(indent + connector) + label);
      if (item.children && item.children.length > 0) {
        lines.push(tree(item.children, { indent: indent + childIndent }));
      }
    }
  }
  return lines.join('\n');
}

// ── Table ─────────────────────────────────────────────────

export function table(headers, rows) {
  if (rows.length === 0) return gray('  (no data)');

  // Calculate column widths
  const colWidths = headers.map((h, i) => {
    const headerLen = stripAnsi(h).length;
    const maxRow = rows.reduce((max, row) => {
      const cellLen = stripAnsi(String(row[i] || '')).length;
      return Math.max(max, cellLen);
    }, 0);
    return Math.max(headerLen, maxRow);
  });

  const separator = gray('  ' + colWidths.map(w => '─'.repeat(w + 2)).join('┬'));
  const lines = [];

  // Header
  const headerLine = '  ' + headers.map((h, i) => {
    return boldWhite(padEnd(` ${h}`, colWidths[i] + 2));
  }).join(gray('│'));
  lines.push(headerLine);
  lines.push(separator);

  // Rows
  for (const row of rows) {
    const rowLine = '  ' + row.map((cell, i) => {
      return padEnd(` ${String(cell || '')}`, colWidths[i] + 2);
    }).join(gray('│'));
    lines.push(rowLine);
  }

  return lines.join('\n');
}

// ── Spinner ───────────────────────────────────────────────

export function spinner(message) {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let i = 0;
  let running = true;

  const interval = setInterval(() => {
    if (!running) return;
    const frame = yellow(frames[i % frames.length]);
    process.stderr.write(`\r${frame} ${message}`);
    i++;
  }, 80);

  return {
    stop(finalMessage) {
      running = false;
      clearInterval(interval);
      process.stderr.write(`\r${' '.repeat(visibleLength(message) + 4)}\r`);
      if (finalMessage) {
        process.stderr.write(`${green('✓')} ${finalMessage}\n`);
      }
    },
    fail(finalMessage) {
      running = false;
      clearInterval(interval);
      process.stderr.write(`\r${' '.repeat(visibleLength(message) + 4)}\r`);
      if (finalMessage) {
        process.stderr.write(`${red('✗')} ${finalMessage}\n`);
      }
    },
    update(newMessage) {
      message = newMessage;
    }
  };
}

// ── Diff ──────────────────────────────────────────────────

export function diff(before, after) {
  const beforeLines = before.split('\n');
  const afterLines = after.split('\n');
  const lines = [];

  // Simple line-by-line diff
  const maxLen = Math.max(beforeLines.length, afterLines.length);

  for (let i = 0; i < maxLen; i++) {
    const bLine = beforeLines[i];
    const aLine = afterLines[i];

    if (bLine === undefined) {
      lines.push(green(`+ ${aLine}`));
    } else if (aLine === undefined) {
      lines.push(red(`- ${bLine}`));
    } else if (bLine !== aLine) {
      lines.push(red(`- ${bLine}`));
      lines.push(green(`+ ${aLine}`));
    } else {
      lines.push(gray(`  ${bLine}`));
    }
  }

  return lines.join('\n');
}

// ── Logo / Banner ─────────────────────────────────────────

export function banner() {
  const logo = boldYellow(`
    ██████╗  ██████╗ ███████╗ ██████╗
    ██╔══██╗██╔═══██╗██╔════╝██╔═══██╗
    ██║  ██║██║   ██║███████╗██║   ██║
    ██║  ██║██║   ██║╚════██║██║   ██║
    ██████╔╝╚██████╔╝███████║╚██████╔╝
    ╚═════╝  ╚═════╝ ╚══════╝ ╚═════╝
  `);
  return logo + '\n' + gray('    AI skills and prompt optimization from your terminal') + '\n';
}

// ── Status indicators ─────────────────────────────────────

export function success(msg) { console.log(`\n  ${green('✓')} ${msg}`); }
export function warn(msg)    { console.log(`\n  ${yellow('⚠')} ${msg}`); }
export function error(msg)   { console.error(`\n  ${red('✗')} ${msg}`); }
export function info(msg)    { console.log(`\n  ${cyan('ℹ')} ${msg}`); }

// ── Section header ────────────────────────────────────────

export function heading(title) {
  const line = gray('─'.repeat(50));
  return `\n  ${boldWhite(title)}\n  ${line}`;
}

// ── Key-value display ─────────────────────────────────────

export function keyValue(pairs, { indent = 2 } = {}) {
  const pad = ' '.repeat(indent);
  const maxKeyLen = Math.max(...pairs.map(([k]) => stripAnsi(k).length));
  return pairs.map(([k, v]) => {
    const keyPadded = padEnd(k, maxKeyLen);
    return `${pad}${gray(keyPadded)}  ${v}`;
  }).join('\n');
}

// ── Progress bar ──────────────────────────────────────────

export function progressBar(current, total, width = 30) {
  const ratio = Math.min(current / total, 1);
  const filled = Math.round(ratio * width);
  const empty = width - filled;
  const bar = green('█'.repeat(filled)) + gray('░'.repeat(empty));
  const pct = Math.round(ratio * 100);
  return `${bar} ${bold(String(pct))}%`;
}
