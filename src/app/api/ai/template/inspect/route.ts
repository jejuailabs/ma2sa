import { NextRequest, NextResponse } from 'next/server';
import { inspectTemplate } from '@/lib/template-filling';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: '양식 파일이 없습니다.' }, { status: 400 });
    const inspection = await inspectTemplate(Buffer.from(await file.arrayBuffer()), file.name);
    return NextResponse.json(inspection);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : '양식 분석에 실패했습니다.' }, { status: 400 });
  }
}
