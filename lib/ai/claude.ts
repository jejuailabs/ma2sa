import { ApiError } from '@/lib/ai/errors';

type ClaudeBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }
  | { type: 'document'; source: { type: 'base64'; media_type: 'application/pdf'; data: string } };

interface ClaudeResponse {
  content?: Array<{ type: string; text?: string }>;
  error?: { message?: string };
}

const imageTypes = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

export async function fileToClaudeBlock(file: File): Promise<ClaudeBlock> {
  const data = Buffer.from(await file.arrayBuffer()).toString('base64');
  if (file.type === 'application/pdf') {
    return { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } };
  }
  if (imageTypes.has(file.type)) {
    return { type: 'image', source: { type: 'base64', media_type: file.type, data } };
  }
  if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
    return { type: 'text', text: Buffer.from(data, 'base64').toString('utf8') };
  }
  throw new ApiError(400, 'UNSUPPORTED_FILE', `${file.name} 파일 형식은 지원하지 않습니다.`);
}

function parseJsonText(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced ?? text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
  try {
    return JSON.parse(candidate.trim()) as unknown;
  } catch {
    throw new ApiError(502, 'AI_INVALID_RESPONSE', 'AI 응답을 구조화하지 못했습니다. 다시 시도해 주세요.');
  }
}

export async function askClaudeJson<T>({
  system,
  prompt,
  attachments = [],
  maxTokens = 4096,
}: {
  system: string;
  prompt: string;
  attachments?: ClaudeBlock[];
  maxTokens?: number;
}): Promise<T> {
  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) throw new ApiError(503, 'AI_NOT_CONFIGURED', 'Claude API 키가 설정되지 않았습니다.');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: [...attachments, { type: 'text', text: prompt }] }],
    }),
    cache: 'no-store',
  });
  const payload = (await response.json()) as ClaudeResponse;
  if (!response.ok) {
    const message = payload.error?.message || 'Claude API 호출에 실패했습니다.';
    throw new ApiError(response.status === 429 ? 429 : 502, response.status === 429 ? 'QUOTA_EXCEEDED' : 'AI_PROCESSING_FAILED', message);
  }

  const text = payload.content?.filter((block) => block.type === 'text').map((block) => block.text ?? '').join('\n');
  if (!text) throw new ApiError(502, 'AI_INVALID_RESPONSE', 'Claude 응답이 비어 있습니다.');
  return parseJsonText(text) as T;
}
