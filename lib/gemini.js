import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { GoogleGenAI } from '@google/genai';

const DEFAULT_MODEL = 'gemini-3.5-flash-lite';
const ANSWER_RULES = `답변 규칙
1. 너는 신진엠텍 품질경영실의 AI 비서다.
2. 제공된 문서에 있는 내용만 근거로 답한다.
3. 답변 끝에 근거를 [시방서 5.2], [검사기준서 No.8], [표준서 4], [계약서 제10조] 형식으로 표시한다.
4. 문서에 없으면 추측하지 말고 "제공된 문서에서 확인되지 않습니다"라고 답한다.
5. 사내 기준서(검사기준서, 작업표준서)의 값이 시방서 최신본과 다르면 양쪽 값을 모두 보여주고, 시방서 값을 기준으로 안내하며 해당 기준서의 개정 검토가 필요하다고 알린다. 개정 이력으로 설명되는 차이인지, 문서만으로 원인을 알 수 없는 차이인지도 구분한다.
6. 계약서와 시방서가 다르면 계약서 제3조 제2항의 우선순위(특수조건 → 계약서 본문 → 시방서)를 따른다.
7. 단위만 다른 값은 환산식을 보여주고, 불일치가 아니라 "단위만 다름"으로 구분한다.
8. 시방서의 기준이 사내 기준서에 없으면 "누락"이라고 분명히 알린다.
9. 최종 합격·불합격 판정과 기준서 개정은 품질 담당자가 결정한다고 안내한다.

작성 지침
- 답변하기 전에 질문한 항목을 시방서, 검사기준서, 표준서, 계약서(특수조건 포함)에서 모두 찾아 대조한다. 값이 다른 문서가 있으면 질문이 짧아도 반드시 각 문서의 값을 함께 보여주고 위 규칙대로 안내한다.
- 계약서(특수조건, 본문)와 시방서의 값이 다르면 첫 문장에 우선순위에 따라 적용되는 값을 답하고, 이어서 다른 문서의 값과 계약서 제3조 제2항을 함께 밝힌다. 시방서 값을 먼저 답하지 않는다.
- 답변은 한국어로 간결하게 작성한다.
- 측정값을 묻는 질문에는 "합격" 또는 "불합격"이라고 단정하지 않는다. 기준 범위와 측정값이 그 범위 안인지 밖인지만 설명한다.
- 시방서 기준이 사내 기준서에 없는 경우에는 "제공된 문서에서 확인되지 않습니다"로 답하지 않고, 첫 문장에서 "누락"이라고 말한다.
- 개정 이력으로 설명되는 차이인지는 시방서의 개정 이력 표를 보고 판단하고, 근거로 [시방서 개정 이력]을 표시한다. 그 표에 없는 차이는 문서만으로 원인을 알 수 없는 차이라고 말한다.
- 단위 환산은 "200 kPa ÷ 98.0665 = 2.04 kgf/cm²"처럼 계산식으로 보여준다.
- 답변에 사용한 문서의 근거를 빠짐없이 표시한다. 근거 표시에는 문서 위치만 쓰고, 이 지시문의 규칙 번호는 답변에 쓰지 않는다.`;
const MAX_TEXT_LENGTH = 2000;
const MAX_MESSAGES = 20;

const KEY_ERROR = 'API 키를 확인하세요.';
const RATE_LIMIT_ERROR = '요청이 많습니다. 잠시 후 다시 시도해 주세요.';
const GENERAL_ERROR = '답변을 받지 못했습니다. 잠시 후 다시 시도해 주세요.';
const KNOWLEDGE_ERROR = '품질 문서를 불러오지 못했습니다. knowledge 폴더를 확인해 주세요.';

// 요청마다 읽으므로 문서를 고쳐도 서버를 다시 켤 필요가 없다.
async function buildSystemInstruction() {
  const folder = path.join(process.cwd(), 'knowledge');
  const names = (await readdir(folder, { recursive: true }))
    .filter((name) => name.toLowerCase().endsWith('.md'))
    .sort();
  if (names.length === 0) {
    throw new Error('knowledge 폴더에 .md 파일이 없습니다.');
  }

  const documents = await Promise.all(
    names.map(async (name) => {
      const content = await readFile(path.join(folder, name), 'utf8');
      return `===== 문서 파일: ${name} =====\n${content}`;
    })
  );
  // 긴 문서 뒤에 규칙을 두어야 모델이 규칙을 더 잘 지킨다.
  return `아래는 제공된 문서다.\n\n${documents.join('\n\n')}\n\n${ANSWER_RULES}`;
}

function parseBody(body) {
  if (typeof body !== 'string') return body;
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

function validateMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return '보낼 메시지가 없습니다.';
  }
  for (const message of messages) {
    const validRole = message?.role === 'user' || message?.role === 'assistant';
    if (!validRole || typeof message.text !== 'string' || !message.text.trim()) {
      return '메시지 형식이 올바르지 않습니다.';
    }
    if (message.text.length > MAX_TEXT_LENGTH) {
      return `메시지는 ${MAX_TEXT_LENGTH.toLocaleString()}자까지 입력할 수 있습니다.`;
    }
  }
  return null;
}

// 최근 메시지만 남기고, 대화가 사용자 메시지로 시작하도록 앞쪽 답변은 뺀다.
export function toGeminiContents(messages) {
  const recent = messages.slice(-MAX_MESSAGES);
  const firstUser = recent.findIndex((message) => message.role === 'user');
  if (firstUser === -1) return [];
  return recent.slice(firstUser).map((message) => ({
    role: message.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: message.text }],
  }));
}

// 오류 원문은 화면으로 보내지 않고, 서버 로그에도 상태 코드만 남긴다.
export function toErrorResponse(error) {
  const status = error?.status;
  console.error(`Gemini 호출 실패: 상태 코드 ${status ?? '없음'}`);

  if (status === 429) {
    return { status: 429, body: { error: RATE_LIMIT_ERROR } };
  }
  const isKeyError =
    status === 401 || status === 403 || /API[_ ]KEY/i.test(String(error?.message));
  if (isKeyError) {
    return { status: 500, body: { error: KEY_ERROR } };
  }
  return { status: 502, body: { error: GENERAL_ERROR } };
}

// api/chat.js와 local-server.js가 함께 쓰는 처리 로직. { status, body }를 돌려준다.
export async function handleChat(rawBody) {
  const messages = parseBody(rawBody)?.messages;

  const validationError = validateMessages(messages);
  if (validationError) {
    return { status: 400, body: { error: validationError } };
  }

  const contents = toGeminiContents(messages);
  if (contents.length === 0) {
    return { status: 400, body: { error: '메시지 형식이 올바르지 않습니다.' } };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { status: 500, body: { error: KEY_ERROR } };
  }

  // 문서 없이 답하면 "확인되지 않습니다"로 오해할 수 있어 오류로 알린다.
  let systemInstruction;
  try {
    systemInstruction = await buildSystemInstruction();
  } catch {
    console.error('품질 문서 읽기 실패');
    return { status: 500, body: { error: KNOWLEDGE_ERROR } };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || DEFAULT_MODEL,
      contents,
      config: { systemInstruction, temperature: 0 },
    });
    if (!response.text) {
      return { status: 502, body: { error: GENERAL_ERROR } };
    }
    return { status: 200, body: { reply: response.text } };
  } catch (error) {
    return toErrorResponse(error);
  }
}
