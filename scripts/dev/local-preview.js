import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import qr from 'qr-image';
import { buildAttendanceUrl, extractScheduleId } from '../../shared/attendance.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');
const publicDir = path.join(rootDir, 'public');

const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number.parseInt(process.env.PORT || '8788', 10);

const MIME_TYPES = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.md', 'text/markdown; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.ttf', 'font/ttf'],
  ['.woff2', 'font/woff2'],
  ['.webp', 'image/webp']
]);

const sendJson = (response, statusCode, payload) => {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
};

const sendText = (response, statusCode, message) => {
  response.writeHead(statusCode, { 'Content-Type': 'text/plain; charset=utf-8' });
  response.end(message);
};

const readRequestBody = async (request) => {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString('utf8');
};

const handleGenerateApi = async (request, response) => {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    sendJson(response, 405, { error: '仅支持 POST 请求' });
    return;
  }

  try {
    const rawBody = await readRequestBody(request);
    const payload = JSON.parse(rawBody || '{}');
    const url = typeof payload.url === 'string' ? payload.url.trim() : '';
    const timestamp = payload.timestamp;

    if (!url) {
      sendJson(response, 400, { error: '缺少课程链接' });
      return;
    }

    if (!timestamp) {
      sendJson(response, 400, { error: '缺少时间参数' });
      return;
    }

    const scheduleId = extractScheduleId(url);
    if (!scheduleId) {
      sendJson(response, 400, { error: '链接无效：未找到课程ID（id 或 scheduleId）' });
      return;
    }

    const attendanceUrl = buildAttendanceUrl({ scheduleId, timestamp });
    const png = qr.imageSync(attendanceUrl, { type: 'png', margin: 2, size: 10 });

    response.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Disposition': 'attachment; filename="qrcode.png"'
    });
    response.end(png);
  } catch (error) {
    console.error('Failed to generate QR code:', error);
    sendJson(response, 500, { error: '服务异常，请稍后重试' });
  }
};

const isPathInsidePublic = (candidatePath) => {
  const relativePath = path.relative(publicDir, candidatePath);
  return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
};

const resolveFilePath = (pathname) => {
  const normalizedPath = pathname === '/' ? '/index.html' : pathname;
  let decodedPath;

  try {
    decodedPath = decodeURIComponent(normalizedPath);
  } catch {
    return { statusCode: 400, message: 'Bad Request' };
  }

  const candidatePath = path.normalize(path.join(publicDir, decodedPath));

  if (!isPathInsidePublic(candidatePath)) {
    return { statusCode: 403, message: 'Forbidden' };
  }

  return { filePath: candidatePath };
};

const serveStaticFile = async (pathname, response) => {
  const { filePath, statusCode, message } = resolveFilePath(pathname);
  if (!filePath) {
    sendText(response, statusCode, message);
    return;
  }

  try {
    const file = await readFile(filePath);
    const extension = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES.get(extension) || 'application/octet-stream';
    response.writeHead(200, { 'Content-Type': contentType });
    response.end(file);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      sendText(response, 404, 'Not Found');
      return;
    }

    console.error('Failed to serve static file:', error);
    sendText(response, 500, 'Internal Server Error');
  }
};

const server = createServer(async (request, response) => {
  const requestUrl = new URL(request.url || '/', `http://${HOST}:${PORT}`);

  if (requestUrl.pathname === '/api/generate') {
    await handleGenerateApi(request, response);
    return;
  }

  await serveStaticFile(requestUrl.pathname, response);
});

server.listen(PORT, HOST, () => {
  console.log(`Local preview running at http://${HOST}:${PORT}`);
});

server.on('error', (error) => {
  console.error('Local preview server failed:', error);
  process.exitCode = 1;
});
