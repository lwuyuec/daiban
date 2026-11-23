import { get, put } from '@vercel/blob';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export const PASSWORD_PATH = 'auth/password.json';
export const MAX_TODOS = 5000;
export const MAX_BODY = 10 * 1024 * 1024;

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function sendJson(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(data));
}

export async function readBody(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw new HttpError(413, '请求数据过大');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

export async function readJson(pathname) {
  let result;
  try {
    result = await get(pathname, { access: 'private', useCache: false });
  } catch (e) {
    throw new HttpError(503, 'Vercel Blob 存储不可用，请确认已创建并连接 Blob Store');
  }
  if (!result || !result.stream) return null;
  try {
    const text = await new Response(result.stream).text();
    return { data: JSON.parse(text), etag: result.blob && result.blob.etag };
  } catch (e) {
    throw new HttpError(500, '存储内容格式错误');
  }
}

export async function writeJson(pathname, data, etag) {
  const options = {
    access: 'private',
    allowOverwrite: true,
    contentType: 'application/json'
  };
  if (etag) options.ifMatch = etag;
  try {
    const result = await put(pathname, JSON.stringify(data), options);
    return { etag: result.etag };
  } catch (e) {
    if (e && (e.status === 412 || e.status === 409 || /precondition/i.test(e.name || ''))) {
      throw new HttpError(409, '看板已被其他设备更新，请重试');
    }
    throw new HttpError(503, '写入 Vercel Blob 失败，请检查存储连接');
  }
}

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(String(password), salt, 64).toString('hex');
  return { salt, hash, createdAt: new Date().toISOString() };
}

export function verifyPassword(password, record) {
  if (!record || !record.salt || !record.hash) return false;
  const expected = Buffer.from(record.hash, 'hex');
  const actual = scryptSync(String(password || ''), record.salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function sanitizeBoard(raw) {
  return String(raw || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || 'default';
}

export function handleError(res, error) {
  const status = error instanceof HttpError ? error.status : 500;
  const message = status === 500 ? '服务暂时不可用' : error.message;
  sendJson(res, status, { error: message });
}
