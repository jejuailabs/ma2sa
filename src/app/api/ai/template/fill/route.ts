import { NextRequest, NextResponse } from 'next/server';
import { fillTemplate } from '@/lib/template-filling';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const valuesRaw = formData.get('values');
    if (!file || typeof valuesRaw !== 'string') return NextResponse.json({ error: '양식 파일과 입력 값이 필요합니다.' }, { status: 400 });
    const values = JSON.parse(valuesRaw) as Record<string, string>;
    const result = await fillTemplate(Buffer.from(await file.arrayBuffer()), file.name, values);
    const body = result.buffer.buffer.slice(result.buffer.byteOffset, result.buffer.byteOffset + result.buffer.byteLength) as ArrayBuffer;
    return new NextResponse(body, {
      headers: {
        'Content-Type': result.mimeType,
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(result.filename)}`,
        'X-Filled-Fields': String(result.filledFieldIds.length),
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : '양식 채우기에 실패했습니다.' }, { status: 400 });
  }
}
