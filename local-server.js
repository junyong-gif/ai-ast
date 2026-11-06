import http from 'node:http';
import { handleChat } from './lib/gemini.js';

const HOST = '127.0.0.1';
const PORT = 3001;
const MAX_BODY_BYTES = 1024 * 1024;

// 내 PC에서 연 화면만 허용한다. 다른 웹사이트가 내 키로 Gemini를 호출하지 못하게 막기 위해서다.
// 'null'은 HTML 파일을 더블클릭해서 열었을 때의 출처다.
function isAllowedOrigin(origin) {
  if (!origin || origin === 'null') return true;
  try {
    const { hostname } = new URL(origin);
    return hostname === 'localhost' || hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) return null;
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;

  if (!isAllowedOrigin(origin)) {
    return sendJson(res, 403, { error: '허용되지 않은 접속입니다.' });
  }
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }

  if (req.url.split('?')[0] !== '/api/chat') {
    return sendJson(res, 404, { error: '없는 주소입니다.' });
  }
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return sendJson(res, 405, { error: 'POST 요청만 사용할 수 있습니다.' });
  }

  try {
    const rawBody = await readBody(req);
    if (rawBody === null) {
      return sendJson(res, 413, { error: '요청 내용이 너무 큽니다.' });
    }
    const { status, body } = await handleChat(rawBody);
    return sendJson(res, status, body);
  } catch {
    return sendJson(res, 500, { error: '서버에서 문제가 발생했습니다.' });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`서버 실행 중: http://${HOST}:${PORT}/api/chat`);
});
