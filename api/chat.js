import { handleChat } from '../lib/gemini.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'POST 요청만 사용할 수 있습니다.' });
  }

  // 요청 본문이 올바른 JSON이 아니면 Vercel이 req.body를 읽을 때 오류를 낸다.
  let rawBody = null;
  try {
    rawBody = req.body;
  } catch {
    rawBody = null;
  }

  const { status, body } = await handleChat(rawBody);
  return res.status(status).json(body);
}
