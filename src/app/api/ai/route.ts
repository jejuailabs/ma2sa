import { NextRequest, NextResponse } from 'next/server';

interface Message {
  role: 'user' | 'assistant';
  content: string | Array<{ type: string; text?: string; source?: { type: string; media_type: string; data: string } }>;
}

export async function POST(req: NextRequest) {
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'API 키가 설정되지 않았습니다. (ANTHROPIC_API_KEY 또는 CLAUDE_API_KEY)' }, { status: 500 });
  }

  try {
    const { feature, messages, system, maxTokens = 4096 } = await req.json() as {
      feature: string;
      messages: Message[];
      system?: string;
      maxTokens?: number;
    };

    if (!feature || !messages?.length) {
      return NextResponse.json({ error: 'feature와 messages가 필요합니다.' }, { status: 400 });
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: maxTokens,
        system: system || '당신은 한국 농촌 마을의 이장·사무장을 돕는 AI 비서입니다. 친절하고 실용적인 답변을 제공하세요.',
        messages,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Anthropic API error:', res.status, err);
      let detail = 'AI 응답 실패';
      try {
        const parsed = JSON.parse(err);
        detail = parsed?.error?.message || `API 오류 (${res.status})`;
      } catch { detail = `API 오류 (${res.status})`; }
      return NextResponse.json({ error: detail }, { status: 502 });
    }

    const data = await res.json();
    const text = data.content?.[0]?.text ?? '';
    const usage = data.usage ?? {};

    return NextResponse.json({
      text,
      usage: {
        inputTokens: usage.input_tokens ?? 0,
        outputTokens: usage.output_tokens ?? 0,
        totalTokens: (usage.input_tokens ?? 0) + (usage.output_tokens ?? 0),
      },
      feature,
    });
  } catch (e) {
    console.error('AI route error:', e);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
