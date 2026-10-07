import { reserveUse } from '@/lib/experience/server';
import { askClaudeJson } from '@/lib/experience/ai/claude';
import { jsonError } from '@/lib/experience/ai/errors';
import { requireText } from '@/lib/experience/ai/validators';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { villageId?: string; text?: string; template?: string };
    await reserveUse(request, 'format');
    const text = requireText(body.text, '문서 초안');
    const template = requireText(body.template || '마을 공지문', '양식', 100);
    const result = await askClaudeJson<{ title: string; content: string }>({
      system: '당신은 대한민국 행정 문서 작성 전문가입니다. 원문의 사실관계를 유지하고 누락된 사실을 창작하지 마세요. 반드시 JSON만 출력하세요.',
      prompt: `다음 초안을 '${template}' 양식에 맞는 완성 문서로 바꾸세요. 공적인 문체, 명확한 제목, 항목 구조를 사용하고 빈 정보는 [입력 필요]로 표시하세요.\n출력: {"title":"","template":"${template}","content":"","missingFields":[""],"checklist":[""]}\n<초안>\n${text}\n</초안>`,
      maxTokens: 6000,
    });
    return Response.json({ success: true, result, meta: { type: 'formatted', template } });
  } catch (error) {
    return jsonError(error);
  }
}
