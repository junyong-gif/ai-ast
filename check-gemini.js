import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

if (!apiKey) {
  console.error('실패: .env에서 GEMINI_API_KEY를 찾지 못했습니다.');
  process.exit(1);
}

console.log(`사용 모델: ${model}`);

try {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model,
    contents: '"연결 성공"이라고 한 문장으로만 답해 주세요.',
  });
  console.log(`Gemini 응답: ${response.text}`);
} catch (error) {
  // 오류 메시지에 키가 섞여 있어도 출력되지 않도록 가린다.
  const message = String(error?.message ?? error).replaceAll(apiKey, '[가림]');
  console.error(`실패: 상태 코드 ${error?.status ?? '없음'}`);
  console.error(message);
  process.exit(1);
}
