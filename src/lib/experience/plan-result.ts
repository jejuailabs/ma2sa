import { planSectionLabels, type PlanResult } from './catalog';
import { cleanPlanText } from './plan-document';

const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const text = (value: unknown, limit: number) => typeof value === 'string' ? cleanPlanText(value).slice(0, limit) : '';
const list = (value: unknown, limit: number): unknown[] => Array.isArray(value) ? value.slice(0, limit) : [];

export function normalizePlanResult(value: unknown): PlanResult | null {
  const data = record(value);
  if (typeof data.title !== 'string' || !data.sections || typeof data.sections !== 'object' || Array.isArray(data.sections)) return null;
  const sections = record(data.sections);
  return {
    title: text(data.title, 100),
    sections: Object.fromEntries(Object.keys(planSectionLabels).map(key => [key, text(sections[key], 3000)])),
    supportArea: data.supportArea === 'activity' ? 'activity' : data.supportArea === 'space' ? 'space' : undefined,
    year: /^20\d{2}$/.test(text(data.year, 4)) ? text(data.year, 4) : '',
    activityField: text(data.activityField, 100), summary: text(data.summary, 1500),
    founded: text(data.founded, 50), members: text(data.members, 150), history: text(data.history, 1000),
    scheduleRows: list(data.scheduleRows, 8).map(item => { const row = record(item); return { name: text(row.name, 100), when: text(row.when, 150), content: text(row.content, 1000) }; }),
    budgetRows: list(data.budgetRows, 8).map(item => { const row = record(item); return { name: text(row.name, 100), category: text(row.category, 50), amount: typeof row.amount === 'number' && Number.isSafeInteger(row.amount) && row.amount >= 0 && row.amount <= 10_000_000_000 ? row.amount : null, basis: text(row.basis, 1000) }; }),
    fundingHistory: list(data.fundingHistory, 2).map(row => list(row, 5).map(cell => text(cell, 300))),
  };
}
