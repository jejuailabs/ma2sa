import { ApiError } from '@/lib/experience/ai/errors';

function apiKey() {
  const value = process.env.OPENAI_API_KEY;
  if (!value) throw new ApiError(503, 'AI_NOT_CONFIGURED', 'OpenAI API 키가 설정되지 않았습니다.');
  return value;
}

export async function transcribeAudio(file: File) {
  const formData = new FormData();
  formData.append('file', file, file.name);
  formData.append('model', process.env.OPENAI_TRANSCRIBE_MODEL || 'gpt-4o-transcribe');
  formData.append('language', 'ko');
  formData.append('response_format', 'json');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey()}` },
    body: formData,
    cache: 'no-store',
  });
  const payload = (await response.json()) as { text?: string; error?: { message?: string } };
  if (!response.ok || !payload.text) {
    throw new ApiError(response.status === 429 ? 429 : 502, response.status === 429 ? 'QUOTA_EXCEEDED' : 'AI_PROCESSING_FAILED', payload.error?.message || '음성 인식에 실패했습니다.');
  }
  return payload.text;
}

export async function generateSpeech(input: string, style: string) {
  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey()}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts',
      voice: process.env.OPENAI_TTS_VOICE || 'coral',
      input: input.slice(0, 4096),
      instructions: `자연스러운 한국어 마을 방송입니다. ${style} 분위기로 또렷하고 천천히 읽어주세요.`,
      response_format: 'mp3',
    }),
    cache: 'no-store',
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new ApiError(response.status === 429 ? 429 : 502, response.status === 429 ? 'QUOTA_EXCEEDED' : 'AI_PROCESSING_FAILED', payload?.error?.message || '음성 생성에 실패했습니다.');
  }
  return Buffer.from(await response.arrayBuffer()).toString('base64');
}
