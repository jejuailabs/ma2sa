import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_TTS_API_KEY = process.env.GOOGLE_TTS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

export async function POST(req: NextRequest) {
  if (!GOOGLE_TTS_API_KEY) {
    return NextResponse.json({ error: 'TTS API 키가 설정되지 않았습니다.' }, { status: 500 });
  }

  try {
    const { text, voice = 'ko-KR-Wavenet-A', speed = 1.0 } = await req.json();
    if (!text?.trim()) {
      return NextResponse.json({ error: '텍스트를 입력해주세요.' }, { status: 400 });
    }

    if (text.length > 5000) {
      return NextResponse.json({ error: '텍스트는 5000자 이하로 입력해주세요.' }, { status: 400 });
    }

    const res = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text },
          voice: { languageCode: 'ko-KR', name: voice },
          audioConfig: { audioEncoding: 'MP3', speakingRate: speed, pitch: 0 },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error('TTS API error:', res.status, err);
      return NextResponse.json({ error: 'TTS 변환 실패. Google Cloud TTS API를 활성화해주세요.' }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json({ audioContent: data.audioContent });
  } catch (e) {
    console.error('TTS route error:', e);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
