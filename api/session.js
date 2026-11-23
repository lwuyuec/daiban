import {
  PASSWORD_PATH,
  HttpError,
  handleError,
  hashPassword,
  readBody,
  readJson,
  sendJson,
  verifyPassword,
  writeJson
} from '../lib/blob-store.mjs';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const record = await readJson(PASSWORD_PATH);
      sendJson(res, 200, { setupRequired: !record });
      return;
    }

    if (req.method === 'POST') {
      const body = JSON.parse((await readBody(req)) || '{}');
      const record = await readJson(PASSWORD_PATH);
      const password = String(body.password || '');

      if (body.action === 'change') {
        if (!record) throw new HttpError(400, '尚未设置访问密码');
        if (!verifyPassword(password, record.data)) throw new HttpError(401, '当前密码不正确');
        const next = String(body.newPassword || '');
        if (next.length < 4) throw new HttpError(400, '新密码至少需要 4 位');
        if (next !== String(body.confirm || '')) throw new HttpError(400, '两次输入的新密码不一致');
        if (next === password) throw new HttpError(400, '新密码不能与当前密码相同');
        await writeJson(PASSWORD_PATH, hashPassword(next), record.etag);
        sendJson(res, 200, { ok: true, changed: true });
        return;
      }

      if (!record) {
        if (password.length < 4) throw new HttpError(400, '访问密码至少需要 4 位');
        if (password !== String(body.confirm || '')) throw new HttpError(400, '两次输入的密码不一致');
        await writeJson(PASSWORD_PATH, hashPassword(password));
        sendJson(res, 200, { ok: true, setup: true });
        return;
      }

      if (!verifyPassword(password, record.data)) throw new HttpError(401, '访问密码不正确');
      sendJson(res, 200, { ok: true });
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
