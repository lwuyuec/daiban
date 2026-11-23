'use strict';

/*
 * Vercel Serverless Function: /api/board
 *
 * 共享看板存储。数据放在 GitHub 仓库的一个 JSON 文件中（建议私有仓库），
 * 通过 GitHub Contents API 读写，利用文件 sha 做乐观并发控制。
 *
 * 需要的环境变量：
 *   TODO_GITHUB_TOKEN  必填，具备目标仓库 Contents 读写权限的 PAT
 *   TODO_DATA_REPO     选填，默认 lwuyuec/daiban（强烈建议改为专用私有仓库）
 *   TODO_DATA_BRANCH   选填，默认 main
 */

const MAX_BODY = 10 * 1024 * 1024;
const MAX_TODOS = 5000;

function send(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(data));
}

function sanitizeBoard(raw) {
  const board = String(raw || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40);
  return board || 'default';
}

function config(env) {
  const token = env.TODO_GITHUB_TOKEN || '';
  const repo = env.TODO_DATA_REPO || 'lwuyuec/daiban';
  const branch = env.TODO_DATA_BRANCH || 'main';
  return { token, repo, branch };
}

function filePath(board) {
  return `data/board-${board}.json`;
}

async function github(env, path, options) {
  const cfg = config(env);
  const url = `https://api.github.com/repos/${cfg.repo}/contents/${path}`;
  const query = new URLSearchParams({ ref: cfg.branch });
  const target = options.method === 'GET' ? `${url}?${query}` : url;

  const response = await fetch(target, {
    method: options.method || 'GET',
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'daiban-shared-board',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.headers || {})
    },
    body: options.body
  });

  const text = await response.text();
  let payload = {};
  try { payload = text ? JSON.parse(text) : {}; } catch (_) {}

  if (response.status === 404) return { status: 404, data: null };
  if (!response.ok) {
    const error = new Error(payload.message || `GitHub API ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return { status: response.status, data: payload };
}

async function readBoard(env, board) {
  const result = await github(env, filePath(board), { method: 'GET' });
  if (result.status === 404) return { board, sha: null, todos: [], updatedAt: null };

  let todos = [];
  try {
    const content = Buffer.from(String(result.data.content || '').replace(/\s/g, ''), 'base64').toString('utf8');
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed.todos)) todos = parsed.todos.slice(0, MAX_TODOS);
  } catch (_) {
    // 内容损坏时按空看板处理，不覆盖文件，等待下一次写入修复
    return { board, sha: result.data.sha, todos: [], updatedAt: null, corrupted: true };
  }
  return {
    board,
    sha: result.data.sha || null,
    todos,
    updatedAt: result.data.updatedAt || null
  };
}

async function writeBoard(env, board, todos, sha) {
  const cfg = config(env);
  const content = Buffer.from(JSON.stringify({ board, todos, updatedAt: new Date().toISOString() }), 'utf8').toString('base64');
  const body = {
    message: `sync board ${board}`,
    content,
    branch: cfg.branch
  };
  if (sha) body.sha = sha;

  const result = await github(env, filePath(board), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return { board, sha: result.data && result.data.content && result.data.content.sha, todos: todos.length };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(Object.assign(new Error('数据过大'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function createBoardHandler(env) {
  return async function handler(req, res) {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, { 'Allow': 'GET, PUT, OPTIONS' });
      res.end();
      return;
    }

    const cfg = config(env);
    if (!cfg.token) {
      send(res, 501, { error: '共享存储尚未配置：缺少 TODO_GITHUB_TOKEN' });
      return;
    }

    const url = new URL(req.url || '/', 'http://localhost');
    const board = sanitizeBoard(url.searchParams.get('board'));

    try {
      if (req.method === 'GET') {
        send(res, 200, await readBoard(env, board));
        return;
      }

      if (req.method === 'PUT') {
        let payload;
        try {
          payload = JSON.parse(await readBody(req) || '{}');
        } catch (e) {
          send(res, 400, { error: '请求数据格式错误' });
          return;
        }
        const todos = payload && Array.isArray(payload.todos) ? payload.todos : null;
        if (!todos || todos.length > MAX_TODOS) {
          send(res, 400, { error: '待办数据格式错误' });
          return;
        }
        const bodyBoard = sanitizeBoard(payload.board || board);
        const result = await writeBoard(env, bodyBoard, todos, payload.sha || null);
        send(res, 200, result);
        return;
      }

      send(res, 405, { error: '不支持的请求方法' });
    } catch (e) {
      if (e.status === 409) {
        send(res, 409, { error: '看板已被其他设备更新，请重试' });
      } else if (e.status === 401 || e.status === 403) {
        send(res, 502, { error: 'GitHub 凭据无效或权限不足，请检查 TODO_GITHUB_TOKEN' });
      } else if (e.status === 404) {
        send(res, 502, { error: '数据仓库不存在或 Token 无权访问，请检查 TODO_DATA_REPO' });
      } else {
        send(res, 502, { error: '共享存储暂时不可用：' + (e.message || '未知错误') });
      }
    }
  };
}

module.exports = createBoardHandler(process.env);
module.exports.createBoardHandler = createBoardHandler;
module.exports.sanitizeBoard = sanitizeBoard;
