// ─────────────────────────────────────────────────────────
// api.js — API client for doso.dev
// Uses native Node.js https/http modules. Zero dependencies.
// ─────────────────────────────────────────────────────────

import https from 'node:https';
import http from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';

// ── Configuration ─────────────────────────────────────────

const DEFAULT_API_URL = 'https://app.doso.dev';
const CONFIG_DIR = join(homedir(), '.doso');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

export function getApiBaseUrl() {
  return process.env.DOSO_API_URL || DEFAULT_API_URL;
}

// ── Config management ─────────────────────────────────────

export async function loadConfig() {
  try {
    const raw = await readFile(CONFIG_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export async function saveConfig(config) {
  await mkdir(CONFIG_DIR, { recursive: true });
  await writeFile(CONFIG_FILE, JSON.stringify(config, null, 2) + '\n', 'utf-8');
}

export async function getToken() {
  // Environment variable takes precedence
  if (process.env.DOSO_TOKEN) {
    return process.env.DOSO_TOKEN;
  }

  const config = await loadConfig();
  return config.token || null;
}

export async function setToken(token) {
  const config = await loadConfig();
  config.token = token;
  await saveConfig(config);
}

// ── HTTP request helper ───────────────────────────────────

function request(method, path, { body, token, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const baseUrl = getApiBaseUrl();
    let parsedUrl;
    try {
      parsedUrl = new URL(path, baseUrl);
    } catch (err) {
      reject(new Error(`Invalid URL: ${baseUrl}${path} — ${err.message}`));
      return;
    }

    const isHttps = parsedUrl.protocol === 'https:';
    const transport = isHttps ? https : http;

    const reqHeaders = {
      'Content-Type': 'application/json',
      'User-Agent': 'doso-cli/0.1.0',
      'Accept': 'application/json',
      ...headers,
    };

    if (token) {
      reqHeaders['Authorization'] = `Bearer ${token}`;
    }

    let bodyStr = null;
    if (body) {
      bodyStr = JSON.stringify(body);
      reqHeaders['Content-Length'] = Buffer.byteLength(bodyStr);
    }

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method,
      headers: reqHeaders,
    };

    const req = transport.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let parsed;
        try {
          parsed = JSON.parse(data);
        } catch {
          parsed = { raw: data };
        }

        if (res.statusCode >= 400) {
          const err = new Error(
            parsed.message || parsed.error || `API error ${res.statusCode}`
          );
          err.statusCode = res.statusCode;
          err.response = parsed;
          reject(err);
          return;
        }

        resolve({
          status: res.statusCode,
          data: parsed,
          headers: res.headers,
        });
      });
    });

    req.on('error', (err) => {
      if (err.code === 'ECONNREFUSED') {
        reject(new Error(
          `Cannot connect to ${baseUrl}. Is the doso.dev API running?\n` +
          `  Set DOSO_API_URL to point to a running instance.`
        ));
      } else {
        reject(err);
      }
    });

    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timed out after 30 seconds'));
    });

    if (bodyStr) {
      req.write(bodyStr);
    }
    req.end();
  });
}

// ── API methods ───────────────────────────────────────────

export async function scanRepo(repoUrl, { token, branch } = {}) {
  const authToken = token || await getToken();
  const body = { url: repoUrl };
  if (branch) body.branch = branch;

  return request('POST', '/api/v1/repos/scan', {
    body,
    token: authToken,
  });
}

export async function analyzeSkill(content, { model, token } = {}) {
  const authToken = token || await getToken();
  const body = { content };
  if (model) body.model = model;

  return request('POST', '/api/v1/skills/analyze', {
    body,
    token: authToken,
  });
}

export async function optimizeSkill(content, { model, token } = {}) {
  const authToken = token || await getToken();
  const body = { content };
  if (model) body.model = model;

  return request('POST', '/api/v1/skills/optimize', {
    body,
    token: authToken,
  });
}

export async function createSkill(skill, { token } = {}) {
  const authToken = token || await getToken();
  return request('POST', '/api/v1/skills', {
    body: skill,
    token: authToken,
  });
}

export async function getSkill(skillId, { token } = {}) {
  const authToken = token || await getToken();
  return request('GET', `/api/v1/skills/${encodeURIComponent(skillId)}`, {
    token: authToken,
  });
}

export async function listSkills({ token } = {}) {
  const authToken = token || await getToken();
  return request('GET', '/api/v1/skills', {
    token: authToken,
  });
}

export async function pushSkill(name, content, { token } = {}) {
  const authToken = token || await getToken();
  return request('PUT', `/api/v1/skills/${encodeURIComponent(name)}`, {
    body: { name, content },
    token: authToken,
  });
}

export async function pullSkill(skillId, { token } = {}) {
  const authToken = token || await getToken();
  return request('GET', `/api/v1/skills/${encodeURIComponent(skillId)}`, {
    token: authToken,
  });
}

export async function getSkillDiff(name, localContent, { token } = {}) {
  const authToken = token || await getToken();
  return request('POST', `/api/v1/skills/${encodeURIComponent(name)}/diff`, {
    body: { content: localContent },
    token: authToken,
  });
}

export async function getProjectStatus({ token } = {}) {
  const authToken = token || await getToken();
  return request('GET', '/api/v1/project/status', {
    token: authToken,
  });
}

// ── Convenience: check connectivity ───────────────────────

export async function ping() {
  try {
    const res = await request('GET', '/api/v1/health');
    return { ok: true, data: res.data };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
