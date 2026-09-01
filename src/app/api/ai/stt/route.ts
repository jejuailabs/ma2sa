import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OPENAI_API_KEY가 설정되지 않았습니다.' }, { status: 500 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: '오디오 파일이 없습니다.' }, { status: 400 });
    }

    const maxSize = 25 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: '파일 크기는 25MB 이하여야 합니다.' }, { status: 400 });
    }

    const openaiForm = new FormData();
    openaiForm.append('file', file);
    openaiForm.append('model', 'whisper-1');
    openaiForm.append('language', 'ko');
    openaiForm.append('response_format', 'text');

    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: openaiForm,
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('OpenAI Whisper error:', res.status, err);
      return NextResponse.json({ error: '음성 인식에 실패했습니다.' }, { status: 502 });
    }

    const text = await res.text();
    return NextResponse.json({ text });
  } catch (e) {
    console.error('STT route error:', e);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
