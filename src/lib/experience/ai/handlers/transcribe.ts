import { reserveUse } from '@/lib/experience/server';
import { askClaudeJson } from '@/lib/experience/ai/claude';
import { jsonError } from '@/lib/experience/ai/errors';
import { transcribeAudio } from '@/lib/experience/ai/openai';
import { requireFile } from '@/lib/experience/ai/validators';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    await reserveUse(request, 'transcribe');
    const file = requireFile(form.get('file'), '회의 녹음', 25 * 1024 * 1024);
    const transcript = await transcribeAudio(file);
    const result = await askClaudeJson<Record<string, unknown>>({
      system: '당신은 마을 회의 내용을 공식 회의록으로 정리하는 전문 기록자입니다. 녹취에 없는 정보는 추측하지 말고 반드시 JSON만 출력하세요.',
      prompt: `아래 녹취를 정리해 JSON으로 출력하세요.\n{"title":"","meetingDate":"","location":"","attendees":[""],"agenda":[{"topic":"","discussion":"","decision":""}],"decisions":[""],"actionItems":[{"task":"","owner":"","dueDate":""}],"notes":"","minutes":"마크다운 형식의 전체 회의록"}\n<녹취>\n${transcript}\n</녹취>`,
      maxTokens: 7000,
    });
    return Response.json({ success: true, result: { ...result, transcript }, meta: { fileName: file.name, type: 'minutes' } });
  } catch (error) {
    return jsonError(error);
  }
}
