import { blankBasics, operationLabels, planLabels, planQuestions, type PlanBasics, type PlanResult } from './catalog';

type QuestionKey = typeof planQuestions[number]['key'];
export type PlanBackup = { basics: PlanBasics; answers: string[]; result: PlanResult | null; step: number; skipped: QuestionKey[] };
export const MAX_PLAN_BACKUP_BYTES = 1_000_000;
const marker = '<!-- ma2sa-plan-backup:v1 -->';
const invalid = () => new Error('불러올 내용을 확인하지 못했어요. 이 앱에서 ‘MD로 저장’한 파일을 선택해 주세요.');
const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw invalid();
  return value as Record<string, unknown>;
};
function text(value: unknown, limit: number, fallback = '') {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || value.length > limit) throw invalid();
  return value;
}
function array(value: unknown, limit: number) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > limit) throw invalid();
  return value as unknown[];
}

/** A backup preserves user-edited values, including blanks and zero amounts.
 * Read only supported fields; never execute Markdown or instructions in a file.
 */
function resultFrom(value: unknown): PlanResult | null {
  if (value === null) return null;
  const raw = object(value), sections = object(raw.sections);
  if (typeof raw.title !== 'string') throw invalid();
  const result: PlanResult = {title:text(raw.title,100),sections:Object.fromEntries(Object.keys(planLabels('community')).map(key => [key,text(sections[key],3000)]))};
  const limits = {year:4,activityField:100,summary:1500,period:100,founded:50,members:150,history:1000} as const;
  for (const key of Object.keys(limits) as (keyof typeof limits)[]) if (raw[key] !== undefined) result[key] = text(raw[key],limits[key]);
  if (raw.supportArea !== undefined && raw.supportArea !== '') {
    if (raw.supportArea !== 'space' && raw.supportArea !== 'activity') throw invalid();
    result.supportArea = raw.supportArea;
  }
  if (raw.scheduleRows !== undefined) result.scheduleRows = array(raw.scheduleRows,8).map(value => {
    const row=object(value);return {name:text(row.name,100),when:text(row.when,150),content:text(row.content,1000)};
  });
  if (raw.budgetRows !== undefined) result.budgetRows = array(raw.budgetRows,8).map(value => {
    const row=object(value), amount=row.amount;
    if (amount !== null && (typeof amount !== 'number' || !Number.isSafeInteger(amount) || amount<0 || amount>10_000_000_000)) throw invalid();
    return {name:text(row.name,100),category:text(row.category,50),amount:amount as number|null,basis:text(row.basis,1000)};
  });
  if (raw.fundingHistory !== undefined) result.fundingHistory = array(raw.fundingHistory,2).map(row => array(row,5).map(value => text(value,300)));
  if (raw.operation !== undefined) {
    const operation=object(raw.operation);
    result.operation=Object.fromEntries(Object.keys(operationLabels).filter(key=>operation[key]!==undefined).map(key=>[key,text(operation[key],1500)]));
  }
  return result;
}

export function validatePlanBackup(value: unknown): PlanBackup {
  const raw=object(value), input=object(raw.basics);
  if (input.type!=='community' && input.type!=='happiness') throw invalid();
  const basics:PlanBasics={...blankBasics,type:input.type};
  for (const key of Object.keys(blankBasics) as (keyof PlanBasics)[]) if (key!=='type') basics[key]=text(input[key],200);
  if (!Array.isArray(raw.answers) || raw.answers.length!==8 || raw.answers.some(answer=>typeof answer!=='string')) throw invalid();
  const answers=raw.answers.map(answer=>text(answer,2000));
  const step=raw.step===undefined?0:raw.step;
  if (typeof step!=='number' || !Number.isInteger(step) || step<0 || step>9) throw invalid();
  const keys=planQuestions.map(q=>q.key);
  const skipped=array(raw.skipped,8);
  if (skipped.some(key=>typeof key!=='string'||!keys.includes(key as QuestionKey))) throw invalid();
  return {basics,answers,result:resultFrom(raw.result),step,skipped:Array.from(new Set(skipped)) as QuestionKey[]};
}

export const planBackupFilename = (type: PlanBasics['type']) => `${type==='happiness'?'행복마을관리소':'마을공동체'}-사업계획서-저장본.md`;

export function writePlanBackup(value: PlanBackup): string {
  const draft=validatePlanBackup(value), {basics,answers,result}=draft;
  const kind=basics.type==='happiness'?'행복마을관리소':'마을공동체';
  const lines=[`# ${kind} 사업계획서`, '', '## 기본정보', '',
    `- 사업명: ${result?.title||basics.title}`,`- ${basics.type==='happiness'?'관리소명':'모임명'}: ${basics.group}`,
    `- 주소: ${basics.address}`,`- ${basics.type==='happiness'?'담당자':'대표자'}: ${basics.representative}`,`- 연락처: ${basics.phone}`,
    `- ${basics.type==='happiness'?'사업비':'보조금'} (원): ${basics.grant}`,`- ${basics.type==='happiness'?'기타 재원':'자부담'} (원): ${basics.contribution}`,
    '', '## 질문에 답한 내용', ''];
  planQuestions.forEach((question,index)=>lines.push(`### ${index+1}. ${question.title}`,'',answers[index],''));
  if (result) {
    lines.push('## 작성한 계획서','');
    for (const [key,label] of Object.entries(planLabels(basics.type))) lines.push(`### ${label}`,'',result.sections[key]||'','');
    lines.push('### 사업기간 및 분야','',`- 사업기간: ${result.period||''}`,`- 분야: ${result.activityField||''}`,'');
    result.scheduleRows?.forEach((row,index)=>lines.push(`### 추진계획 ${index+1}`,'',`- 활동명: ${row.name}`,`- 일정: ${row.when}`,'',row.content,''));
    result.budgetRows?.forEach((row,index)=>lines.push(`### 예산 ${index+1}`,'',`- 항목: ${row.name}`,`- 비목: ${row.category}`,`- 금액 (원): ${row.amount===null?'':row.amount}`,'',row.basis,''));
    if (basics.type==='happiness') for (const [key,label] of Object.entries(operationLabels)) lines.push(`### ${label}`,'',result.operation?.[key as keyof typeof operationLabels]||'','');
    if (result.history) lines.push('### 주요 활동 이력','',result.history,'');
  }
  lines.push('## 다시 불러오기 정보','', '이 파일은 앱의 ‘MD 불러오기’에서 답변과 수정한 결과를 복원할 수 있습니다.', '', marker, '```json',
    JSON.stringify({format:'ma2sa-plan-backup',version:1,savedAt:new Date().toISOString(),draft},null,2), '```','');
  const markdown=lines.join('\n');
  if (new TextEncoder().encode(markdown).length>MAX_PLAN_BACKUP_BYTES) throw new Error('저장할 내용이 너무 많아요. 항목별 내용을 줄인 뒤 다시 저장해 주세요.');
  return markdown;
}

export function readPlanBackup(markdown: string): PlanBackup {
  if (new TextEncoder().encode(markdown).length>MAX_PLAN_BACKUP_BYTES) throw new Error('MD 파일은 1MB 이하로 선택해 주세요.');
  const source=markdown.replace(/^\uFEFF/,'').replace(/\r\n/g,'\n');
  const position=source.lastIndexOf(marker);
  if (position<0) throw invalid();
  const block=source.slice(position+marker.length).trimStart().match(/^```json[ \t]*\n([\s\S]*?)\n```(?=\n|$)/);
  if (!block) throw invalid();
  let raw:Record<string,unknown>;
  try { raw=object(JSON.parse(block[1])); } catch { throw invalid(); }
  if (raw.format!=='ma2sa-plan-backup'||raw.version!==1) throw invalid();
  return validatePlanBackup(raw.draft);
}
