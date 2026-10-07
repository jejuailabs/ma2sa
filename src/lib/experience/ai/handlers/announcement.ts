import { reserveUse } from '@/lib/experience/server';
import { askClaudeJson, fileToClaudeBlock } from '@/lib/experience/ai/claude';
import { jsonError } from '@/lib/experience/ai/errors';
import { requireFile } from '@/lib/experience/ai/validators';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    await reserveUse(request, 'announcement');
    const file = requireFile(form.get('file'), '공고문', 10 * 1024 * 1024);
    const attachment = await fileToClaudeBlock(file);
    const result = await askClaudeJson<Record<string, unknown>>({
      system: '당신은 대한민국 농어촌 마을 이장과 사무장을 돕는 공고문 분석 전문가입니다. 문서에 없는 사실은 추측하지 말고 반드시 JSON만 출력하세요.',
      prompt: `첨부 공고문을 분석해 아래 JSON 구조로 답하세요. 날짜는 가능하면 YYYY-MM-DD로 표준화하세요.\n{"projectName":"","summary":"","eligibility":"","supportDetails":"","amount":"","deadline":"","applicationMethod":"","requiredDocs":[""],"actionItems":[""],"cautions":[""]}`,
      attachments: [attachment],
    });
    return Response.json({ success: true, result, meta: { fileName: file.name, type: 'announcement' } });
  } catch (error) {
    return jsonError(error);
  }
}
