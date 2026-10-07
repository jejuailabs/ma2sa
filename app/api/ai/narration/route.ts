import { authorizeVillageAdmin } from '@/lib/ai/auth';
import { askClaudeJson } from '@/lib/ai/claude';
import { jsonError } from '@/lib/ai/errors';
import { generateSpeech } from '@/lib/ai/openai';
import { requireText } from '@/lib/ai/validators';

export const runtime = 'nodejs';
export const maxDuration = 120;

const styleLabels: Record<string, string> = { formal: '정중하고 명확한 공지', friendly: '따뜻하고 친근한 안내', cheerful: '밝고 경쾌한 안내' };

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { villageId?: string; text?: string; style?: string };
    const villageId = requireText(body.villageId, '마을 ID', 200);
    await authorizeVillageAdmin(request, villageId);
    const text = requireText(body.text, '방송 내용', 3500);
    const style = styleLabels[body.style || 'formal'] || styleLabels.formal;
    const refined = await askClaudeJson<{ title: string; script: string }>({
      system: '당신은 한국 농어촌 마을 스피커 방송 원고 작가입니다. 사실을 추가하지 말고 반드시 JSON만 출력하세요.',
      prompt: `다음 내용을 ${style} 톤의 마을 방송 원고로 다듬으세요. 자연스러운 구어체를 쓰고, 날짜·장소·행동 요청 등 핵심 정보는 명확히 반복하세요. 음성 합성에 방해되는 괄호형 지시문은 넣지 마세요.\n출력: {"title":"","script":"","estimatedSeconds":0}\n<원문>\n${text}\n</원문>`,
      maxTokens: 3000,
    });
    const audioBase64 = await generateSpeech(refined.script, style);
    return Response.json({ success: true, result: { ...refined, audioBase64, audioMimeType: 'audio/mpeg' }, meta: { type: 'narration', style } });
  } catch (error) {
    return jsonError(error);
  }
}
