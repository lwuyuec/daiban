import {
  MAX_TODOS,
  PASSWORD_PATH,
  HttpError,
  handleError,
  readBody,
  readJson,
  sanitizeBoard,
  sendJson,
  verifyPassword,
  writeJson
} from '../lib/blob-store.mjs';

function requirePassword(req, record) {
  const password = req.headers['x-access-password'] || '';
  if (!verifyPassword(password, record.data)) throw new HttpError(401, '访问密码不正确或已失效');
}

export default async function handler(req, res) {
  try {
    const auth = await readJson(PASSWORD_PATH);
    if (!auth) throw new HttpError(503, '尚未设置访问密码');
    requirePassword(req, auth);

    const board = sanitizeBoard(new URL(req.url || '/', 'http://localhost').searchParams.get('board'));
    const pathname = `boards/${board}.json`;

    if (req.method === 'GET') {
      const item = await readJson(pathname);
      sendJson(res, 200, {
        todos: item && Array.isArray(item.data.todos) ? item.data.todos.slice(0, MAX_TODOS) : [],
        version: item ? item.etag : null
      });
      return;
    }

    if (req.method === 'PUT') {
      const body = JSON.parse((await readBody(req)) || '{}');
      if (!Array.isArray(body.todos) || body.todos.length > MAX_TODOS) {
        throw new HttpError(400, '待办数据格式错误');
      }
      const result = await writeJson(
        pathname,
        { board, todos: body.todos, updatedAt: new Date().toISOString() },
        body.version || null
      );
      sendJson(res, 200, { version: result.etag });
      return;
    }

    throw new HttpError(405, '不支持的请求方法');
  } catch (error) {
    if (error instanceof SyntaxError) {
      handleError(res, new HttpError(400, '请求数据格式错误'));
      return;
    }
    handleError(res, error);
  }
}
