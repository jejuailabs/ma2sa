import { budgetSummary, type PlanBasics, type PlanResult } from './catalog';

/** Compatibility cleanup for drafts saved by older prompts. Unknown values stay
 * blank in documents; they are never replaced with another team's sample data. */
export function cleanPlanText(value: string | undefined): string {
  return (value || '')
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '')
    .replace(/(?:^|\n|(?<=[.!?])\s+)[^.!?\n]*\b(?:budgetRows|scheduleRows|undefined)\b[^.!?\n]*(?:[.!?]|$)/g, '')
    .replace(/(?:구체적인\s*)?(?:시작일|종료일|시작\s*시기|종료\s*시기|보조금|자부담(?:\s*비율)?|지원금|사업명|모임명|대표자(?:\s*성명)?|구성연도)(?:은|는|이|가|:)?\s*\[(?:입력\s*필요|확인(?:\s*필요)?|미정|미입력)[^\]]*\](?:입니다|이다|이며|이고|으로|로)?[.!]?/g, '')
    .replace(/\[(?:입력\s*필요|확인(?:\s*필요)?|미정|미입력|추후\s*입력|작성\s*필요|기재\s*필요)[^\]]*\]/g, '')
    .replace(/(?:남|여)\s*명(?:\s*[,·])?/g, '')
    .replace(/\(\s*[,·]?\s*\)/g, '')
    .replace(/○{2,}|◯{2,}/g, '')
    .replace(/^[ \t]*(?:입력\s*필요|미정|미입력|확인\s*필요)[.!]?[ \t]*$/gm, '')
    .replace(/[ \t]+([,.])/g, '$1').replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n').trim();
}

function shortText(value: string, limit: number) {
  const flat = cleanPlanText(value).replace(/\s+/g, ' ');
  if (flat.length <= limit) return flat;
  const firstSentence = flat.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim();
  if (firstSentence && firstSentence.length <= limit) return firstSentence;
  const head = flat.slice(0, limit - 1);
  const boundary = head.lastIndexOf(' ');
  return (boundary > limit * 0.65 ? head.slice(0, boundary) : head) + '…';
}

export function planDocumentContent(basics: PlanBasics, result: PlanResult) {
  const s = Object.fromEntries(Object.entries(result.sections).map(([key, value]) => [key, cleanPlanText(value)]));
  const title = cleanPlanText(result.title) || cleanPlanText(basics.title);
  const budget = budgetSummary(basics);
  const thousand = (value: number | null) => value === null ? '' : (value / 1000).toLocaleString('ko-KR', {maximumFractionDigits: 3});
  const originalSummary = cleanPlanText(result.summary);
  // The application is a cover sheet. Full narratives belong in the plan.
  const summary = originalSummary ? shortText(originalSummary, 360) :
    [['목적', s.purpose], ['대상', s.target], ['활동', s.activities], ['기대효과', s.effects]]
      .filter(([,value]) => value).map(([label,value]) => `${label}: ${shortText(value, 80)}`).join('\n');
  const summaryDetail = originalSummary.length > 360 ? originalSummary : '';
  const scheduleRows = (result.scheduleRows || []).map(row => {
    const name = cleanPlanText(row.name), when = cleanPlanText(row.when), content = cleanPlanText(row.content);
    return {
      name: name.length > 45 ? '' : name,
      when: when.length > 55 ? '' : when,
      content: [name.length > 45 ? `활동명: ${name}` : '', when.length > 55 ? `일정: ${when}` : '', content].filter(Boolean).join('\n'),
    };
  }).filter(row => row.name || row.when || row.content);
  if (!scheduleRows.length) scheduleRows.push({name:'',when:'',content:s.activities || ''});
  const budgetRows = (result.budgetRows || []).map(row => {
    const name=cleanPlanText(row.name), category=cleanPlanText(row.category), basis=cleanPlanText(row.basis);
    return {name:name.length > 45 ? '' : name,category:category.length > 25 ? '' : category,amount:row.amount,
      basis:[name.length > 45 ? `항목: ${name}` : '',category.length > 25 ? `비목: ${category}` : '',basis].filter(Boolean).join('\n')};
  }).filter(row=>row.name||row.category||row.amount!==null||row.basis);
  const budgetTotal=budgetRows.length&&budgetRows.every(row=>row.amount!==null)?budgetRows.reduce((sum,row)=>sum+(row.amount||0),0):null;
  const supportArea = result.supportArea === 'activity' ? '공동체 활동' : result.supportArea === 'space' ? '공간조성' : '';
  const fields: Record<string,string> = {
    supportArea, activityField:cleanPlanText(result.activityField), addressLabel:result.supportArea==='space'?'공간조성지 주소':'모임소재지 주소',
    group:cleanPlanText(basics.group),representative:cleanPlanText(basics.representative),address:cleanPlanText(basics.address),phone:cleanPlanText(basics.phone),title,
    totalThousand:thousand(budget.total),grantThousand:thousand(budget.grant),contributionThousand:thousand(budget.contribution),
    ratioNote:budget.ratio===null?'':`보조금 대비 자부담 ${budget.ratio}%`,
    summary,summaryDetail,summaryDetailHeading:summaryDetail?'사업 개요 상세':'',scheduleNote:s.schedule||'',
    purposeWithTarget:[s.purpose,s.target?`사업 대상: ${s.target}`:''].filter(Boolean).join('\n\n'),participation:s.participation||'',
    effects:s.effects||'',effectsHeading:s.effects?'기대효과':'',scheduleHeading:'활동 내용·장소·참여자',
    groupIntro:s.groupIntro||'',founded:cleanPlanText(result.founded),members:cleanPlanText(result.members),history:cleanPlanText(result.history),
    budgetTotal:thousand(budgetTotal),budgetNote:'',budgetNarrative:s.budget||'',budgetNarrativeHeading:s.budget?'예산 설명':'',
    applicationFooter:`작성한 내용은 사실과 다름없으며, 가평군 마을공동체 주민제안 공모사업을 신청합니다.\n${result.year || '    '}년    월    일\n대표제안자: ${cleanPlanText(basics.representative)}                (서명/날인)\n가평군수 귀하`,
    missing:'',
  };
  for(let index=0;index<8;index++){
    const row=scheduleRows[index],item=budgetRows[index];
    fields[`schedule${index}Name`]=row?.name||'';fields[`schedule${index}When`]=row?.when||'';fields[`schedule${index}Content`]=row?.content||'';
    fields[`budget${index}Name`]=item?.name||'';fields[`budget${index}Category`]=item?.category||'';
    fields[`budget${index}Amount`]=item?thousand(item.amount):'';fields[`budget${index}Basis`]=item?.basis||'';
  }
  for(let row=0;row<2;row++)for(let column=0;column<5;column++)fields[`funding${row}${column}`]=cleanPlanText(result.fundingHistory?.[row]?.[column]);
  return {fields,scheduleCount:Math.min(8,scheduleRows.length),budgetCount:Math.max(1,Math.min(8,budgetRows.length)),sections:s};
}

export const planDocumentInstructions = `제출용 문서의 값만 작성하세요. 알 수 없는 값은 빈 문자열, 미정 금액은 null, 자료 없는 표는 빈 배열로 남기세요. [입력 필요], [확인], 작성 안내, 샘플 값, 예시의 숫자·단체·실적을 실제 값으로 쓰지 마세요. 사용자가 말한 사실만 씁니다. 신청서 summary는 목적·대상·활동·기대효과의 짧은 요약으로 280자 이내이며 본문 전체를 반복하지 않습니다. sections는 항목당 700자 이내입니다. title은 실제 활동에 근거한 간결한 제목입니다. scheduleRows.name은 25자 이내 활동명, when은 35자 이내 날짜·기간·횟수만 쓰고 설명은 content에 씁니다. budgetRows에는 실제로 언급된 항목만 넣고 name은 25자 이내 항목명, category는 짧은 비목, amount는 원 단위 정수 또는 null, basis는 확인된 산출기초만 씁니다. 예산 설명을 합계나 모든 행에 반복하지 않습니다. 지원분야 supportArea는 답변에 공간 공사·리모델링이 명확하면 space, 주민 활동 사업이 명확하면 activity, 불명확하면 빈 문자열입니다. 날짜·구성연도·인원·금액·주소·실적을 지어내지 않습니다. 모임 활동 이력은 5줄 이내입니다. 확정 예산을 바꾸지 마세요. amount는 확인된 단가 × 수량·인원 × 횟수와 일치해야 하며 미정이면 null입니다. scheduleRows와 budgetRows는 각각 최대 8행, fundingHistory는 최대 2행입니다.`;
export const planDocumentShape = {
  title:'',supportArea:'',year:'',activityField:'',summary:'',
  sections:{purpose:'',target:'',activities:'',participation:'',schedule:'',budget:'',effects:'',groupIntro:''},
  scheduleRows:[{name:'',when:'',content:''}],budgetRows:[{name:'',category:'',amount:null,basis:''}],
  founded:'',members:'',history:'',fundingHistory:[],
};
