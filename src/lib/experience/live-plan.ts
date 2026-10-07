import { blankBasics, planQuestions, type PlanBasics, type PlanResult } from './catalog';

export type QuestionKey = (typeof planQuestions)[number]['key'];
export type InterviewMessage = { id: string; role: 'user' | 'assistant'; text: string; start?: number; end?: number; source?: 'voice' | 'text'; session?: string };
export type InterviewDraft = { version: 1; expires: number; basics: PlanBasics; answers: string[]; skipped: QuestionKey[]; messages: InterviewMessage[]; result: PlanResult | null };
export type AnswerUpdate = { key: QuestionKey; answer: string; skipped?: boolean };
export const LIVE_DRAFT_KEY = 'ma2sa-live-interview-v1';
export const LIVE_MAX_SECONDS = 15 * 60;
export const questionKeys = planQuestions.map(q => q.key);
export function parseTurnOutput(raw: unknown): { updates: AnswerUpdate[]; reply: string } | null {
  if (!raw || typeof raw !== 'object') return null;
  const outer = raw as Record<string, unknown>;
  const value = (outer.output && typeof outer.output === 'object' ? outer.output : outer) as Record<string, unknown>;
  if (typeof value.reply !== 'string' || !value.reply.trim() || !value.updates || typeof value.updates !== 'object') return null;
  const candidates = Array.isArray(value.updates) ? value.updates : Object.entries(value.updates).map(([key, update]) => update && typeof update === 'object' ? { ...update, key } : null);
  const updates: AnswerUpdate[] = [];
  for (const item of candidates) {
    if (!item || typeof item !== 'object' || !questionKeys.includes(item.key) || typeof item.answer !== 'string') return null;
    updates.push({ key: item.key, answer: item.answer.slice(0, 2000), skipped: item.skipped === true });
  }
  return { updates, reply: value.reply.slice(0, 1200) };
}
export const welcome = '안녕하세요. 마을AI사무장이에요. 편하게 이야기해 주시면 사업계획서로 정리해 드릴게요. 우리 마을에서 가장 바꾸고 싶은 것은 무엇인가요?';
export function newDraft(): InterviewDraft { return { version: 1, expires: Date.now() + 86400000, basics: { ...blankBasics }, answers: Array(8).fill(''), skipped: [], messages: [], result: null }; }
export function nextQuestion(answers: string[], skipped: QuestionKey[]) { return planQuestions.find((q, i) => !answers[i]?.trim() && !skipped.includes(q.key))?.key ?? null; }
export function applyUpdates(answers: string[], skipped: QuestionKey[], updates: AnswerUpdate[]) {
  const next = [...answers]; const omitted = new Set(skipped);
  for (const update of updates) {
    const index = questionKeys.indexOf(update.key);
    if (index < 0 || typeof update.answer !== 'string') continue;
    next[index] = update.answer.trim().slice(0, 2000);
    if (update.skipped && !next[index]) omitted.add(update.key); else omitted.delete(update.key);
  }
  return { answers: next, skipped: Array.from(omitted) };
}
export function readLiveDraft(raw: string | null): InterviewDraft {
  try {
    const value = JSON.parse(raw || 'null');
    if (value?.version !== 1 || value.expires <= Date.now() || !Array.isArray(value.answers) || value.answers.length !== 8 || value.answers.some((v: unknown) => typeof v !== 'string')) return newDraft();
    const draft = newDraft();
    draft.answers = value.answers.map((v: string) => v.slice(0, 2000));
    for (const key of Object.keys(blankBasics) as (keyof PlanBasics)[]) {
      if (key === 'type') draft.basics.type = value.basics?.type === 'happiness' ? 'happiness' : 'community';
      else draft.basics[key] = typeof value.basics?.[key] === 'string' ? value.basics[key].slice(0, 200) : '';
    }
    draft.skipped = Array.isArray(value.skipped) ? value.skipped.filter((key: QuestionKey) => questionKeys.includes(key)) : [];
    draft.messages = Array.isArray(value.messages) ? value.messages.filter((m: InterviewMessage) => ['user', 'assistant'].includes(m?.role) && typeof m.text === 'string' && typeof m.id === 'string').slice(-80) : [];
    if (typeof value.result?.title === 'string' && value.result.sections && Object.values(value.result.sections).every(v => typeof v === 'string')) draft.result = value.result;
    return draft;
  } catch { return newDraft(); }
}

// Full-duplex captions have independent speaker timelines; an acknowledgment must not split a user's ongoing sentence.
export function appendTranscript(messages: InterviewMessage[], role: 'user' | 'assistant', delta: string, start: number, end: number, session = ''): InterviewMessage[] {
  if (!delta) return messages;
  const index = messages.findLastIndex(m => m.role === role && m.source === 'voice' && m.session === session);
  const previous = messages[index];
  if (previous && previous.end !== undefined && start >= previous.end - 250 && start - previous.end < 1600) {
    return messages.map((m, i) => i === index ? { ...m, text: (m.text + delta).slice(-12000), end } : m);
  }
  return [...messages, { id: `${session}-${role}-${start}-${end}-${messages.length}`, role, text: delta, start, end, session, source: 'voice' as const }].slice(-80);
}
