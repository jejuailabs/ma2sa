import { authorizeVillageAdmin } from '@/lib/ai/auth';
import { askClaudeJson, fileToClaudeBlock } from '@/lib/ai/claude';
import { ApiError, jsonError } from '@/lib/ai/errors';
import { requireFile } from '@/lib/ai/validators';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const villageId = String(form.get('villageId') ?? '');
    await authorizeVillageAdmin(request, villageId);
    const entries = form.getAll('files');
    if (entries.length > 10) throw new ApiError(400, 'INVALID_INPUT', '영수증은 한 번에 10장까지 처리할 수 있습니다.');
    const files = entries.map((entry) => requireFile(entry, '영수증', 10 * 1024 * 1024));
    if (!files.length) throw new ApiError(400, 'INVALID_INPUT', '영수증 이미지를 선택해 주세요.');
    const attachments = await Promise.all(files.map(fileToClaudeBlock));
    const result = await askClaudeJson<{ items: unknown[]; totalAmount: number }>({
      system: '당신은 한국 영수증을 정확히 장부 데이터로 변환하는 회계 보조자입니다. 읽을 수 없는 값은 추측하지 말고 null로 두며 반드시 JSON만 출력하세요.',
      prompt: `첨부된 영수증 전체를 읽고 품목 단위로 아래 JSON을 출력하세요. 금액은 쉼표 없는 숫자, 날짜는 YYYY-MM-DD 형식입니다. category는 식비/사무용품/행사비/시설비/교통비/기타 중 하나로 분류하세요.\n{"items":[{"date":"","vendor":"","item":"","quantity":1,"unitPrice":0,"total":0,"category":"기타","sourceFile":""}],"totalAmount":0,"warnings":[""]}`,
      attachments,
      maxTokens: 6000,
    });
    return Response.json({ success: true, result, meta: { fileNames: files.map((file) => file.name), type: 'receipt' } });
  } catch (error) {
    return jsonError(error);
  }
}
