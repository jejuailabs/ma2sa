import { budgetSummary, operationLabels, type PlanBasics, type PlanResult } from './catalog';

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
  const community = basics.type === 'community';
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
      content: [(community || name.length > 45) && name ? `활동명: ${name}` : '', when.length > 55 ? `일정: ${when}` : '', content].filter(Boolean).join('\n'),
    };
  }).filter(row => row.name || row.when || row.content);
  if (!scheduleRows.length) scheduleRows.push({name:'',when:'',content:''});
  const budgetRows = (result.budgetRows || []).map(row => {
    const name=cleanPlanText(row.name), category=cleanPlanText(row.category), basis=cleanPlanText(row.basis);
    return {name:name.length > 45 ? '' : name,category:category.length > 25 ? '' : category,amount:row.amount,
      basis:[(community || name.length > 45) && name ? `항목: ${name}` : '',category.length > 25 ? `비목: ${category}` : '',basis].filter(Boolean).join('\n')};
  }).filter(row=>row.name||row.category||row.amount!==null||row.basis);
  const budgetTotal=budgetRows.length&&budgetRows.every(row=>row.amount!==null)?budgetRows.reduce((sum,row)=>sum+(row.amount||0),0):null;
  const supportArea = result.supportArea === 'activity' ? '공동체 활동' : result.supportArea === 'space' ? '공간조성' : '';
  const activity = cleanPlanText(result.activityField);
  const activityOptions = ['복지/돌봄/나눔','문화예술/관광/체육','기후/환경/생태','교육/학술연구','자원봉사/기부','권리보호(아동/여성/가족/이주민/소수자 등)','안전(주택/교통/재난 등)','보건/의료/건강','경제활동(도소매업/유통/농수축산업/사회서비스 등)'];
  const option = (index: number) => `${activity === activityOptions[index] ? '■' : '□'} ${activityOptions[index]}`;
  const purposeBlock = [['□ 사업 목적 및 필요성', s.purpose], ['□ 사업 대상', s.target], ['□ 기대효과', s.effects], ['□ 사업 개요 상세', summaryDetail]]
    .filter(([, value]) => value).map(([label, value]) => `${label}\n${value}`).join('\n\n');
  const fields: Record<string,string> = {
    supportArea, activityField:cleanPlanText(result.activityField), addressLabel:result.supportArea==='space'?'공간조성지 주소':'모임소재지 주소',
    activityOptions: [[0,1],[2,3,4],[5],[6,7],[8]].map(row => row.map(option).join('  ')).join('\n') + `\n${activity && !activityOptions.includes(activity) ? '■' : '□'} 기타 (${activityOptions.includes(activity) ? '' : activity})`,
    period: cleanPlanText(result.period) || (s.schedule?.length <= 70 ? s.schedule : '') || '',
    purposeBlock, purpose:s.purpose||'', target:s.target||'', activitiesDetail:s.activities||'',
    budgetScope: community ? '<사업 예산> (단위: 천원)' : '단위: 천원',
    group:cleanPlanText(basics.group),representative:cleanPlanText(basics.representative),address:cleanPlanText(basics.address),phone:cleanPlanText(basics.phone),title,
    totalThousand:thousand(budget.total),grantThousand:thousand(budget.grant),contributionThousand:thousand(budget.contribution),
    ratioNote:budget.ratio===null?'':`보조금 대비 자부담 ${budget.ratio}%`,
    summary,summaryDetail,summaryDetailHeading:summaryDetail?'사업 개요 상세':'',scheduleNote:s.schedule||'',
    purposeWithTarget:[s.purpose,s.target?`사업 대상: ${s.target}`:''].filter(Boolean).join('\n\n'),participation:s.participation||'',
    effects:s.effects||'',effectsHeading:s.effects?'기대효과':'',scheduleHeading:'활동 내용·장소·참여자',
    groupIntro:s.groupIntro||'',founded:cleanPlanText(result.founded),members:cleanPlanText(result.members),history:cleanPlanText(result.history),
    budgetTotal:thousand(budgetTotal),budgetNote:'',budgetNarrative:s.budget||'',budgetNarrativeHeading:s.budget?'예산 설명':'',
    applicationFooter:`작성한 내용은 사실과 다름없으며, 가평군 마을공동체 주민제안 공모사업을 신청합니다.\n${result.year || '    '}년    월    일\n대표제안자: ${cleanPlanText(basics.representative)}                (서명/날인)\n첨부서류: 사업계획서(견적서 포함), 모임 소개서 및 해당 공고에서 요구하는 증빙서류\n가평군수 귀하`,
    missing:'',
  };
  for (const key of Object.keys(operationLabels) as (keyof typeof operationLabels)[]) fields[`operation${key}`] = cleanPlanText(result.operation?.[key]);
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
export function planTypeInstructions(type: PlanBasics['type']) {
  return type === 'happiness'
    ? `행복마을관리소의 생활밀착형 공공서비스·지역 특색사업 계획서입니다. 가평군 마을공동체 통합지원센터의 사업 안내(https://gpcommunity.or.kr/sub04_07)는 지역 안전 확보, 지역 환경 개선, 주민편의 서비스, 지역 특색사업을 주요 업무로 설명합니다. 이 네 분야는 분류 기준이며 모두 수행한다고 쓰지 마세요. 사용자 답변에 해당하는 분야만 activityField에 씁니다. sections.target은 서비스 대상과 지역, activities는 구체적인 생활서비스, participation은 주민참여와 협력, groupIntro는 관리소 현황과 운영 주체입니다. operation.roles는 담당자 역할, serviceProcess는 접수·기관 연계, safety는 현장 안전·개인정보 관리, records는 실적 기록·성과 확인입니다. 각 내용은 답변에 근거가 있을 때만 채우고 없으면 빈 문자열입니다. 공모신청서나 공식 제출서식으로 표현하지 마세요. 공간조성 지원조건·자부담 5%·센터에 소개된 다른 관리소의 인원·주소·사업비를 적용하지 마세요. supportArea, fundingHistory는 비워 둡니다. period는 확인된 시작·종료 시기만 70자 이내로 요약합니다.`
    : '가평군 마을공동체 주민제안 공모사업 양식으로 작성합니다. 신청서, 사업개요, 추진계획, 모임 소개, 비목별 예산의 순서입니다. period에는 확인된 시작·종료 시기만 70자 이내로 요약합니다. operation은 비워 둡니다. 예시 단체의 이름·활동·예산·과거 실적을 사용자의 사실로 옮기지 마세요.';
}
export const planDocumentShape = {
  title:'',supportArea:'',year:'',activityField:'',summary:'',period:'',
  sections:{purpose:'',target:'',activities:'',participation:'',schedule:'',budget:'',effects:'',groupIntro:''},
  scheduleRows:[{name:'',when:'',content:''}],budgetRows:[{name:'',category:'',amount:null,basis:''}],
  founded:'',members:'',history:'',fundingHistory:[],
  operation:{roles:'',serviceProcess:'',safety:'',records:''},
};
