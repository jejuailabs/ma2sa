import data from './saeteo-sample.json';
import { blankBasics, type PlanBasics, type PlanResult } from './catalog';

export { data as saeteoSample };
export const sampleBasics: PlanBasics = { ...blankBasics, group: '새터 반찬 두레', title: data.titles[0], grant: '2322000', contribution: '' };
export const sampleResult: PlanResult = {
  title: data.titles[0], supportArea: 'activity', year: '2027', activityField: '복지/돌봄/나눔',
  summary: data.application[5][1], founded: '2023년', members: '총 12명 (남 [확인]명, 여 [확인]명)',
  history: data.groupHistory, fundingHistory: data.fundingHistory,
  scheduleRows: data.schedule.map(([name, when, content]) => ({ name, when, content })),
  budgetRows: data.budget.map(([name, category, amount, basis]) => ({ name, category, amount: Number(amount.replaceAll(',', '')) * 1000, basis })),
  sections: {
    purpose: data.purpose,
    target: '70세 이상 어르신 20분(혼자 사시는 분 약 10분)과 새터 반찬 두레 회원 12명.',
    activities: data.schedule.map(([name, , content]) => `${name}: ${content}`).join('\n\n'),
    participation: data.roles.join('\n') + '\n\n매달 첫 수요일 체조 뒤에 회의하고, 차림표는 어르신 의견을 먼저 듣고 정한다. 청년회 차량과 보건지소 영양 이야기 협조를 확인한다.',
    schedule: '2027년 보조금 교부 뒤 4월~10월. 둘째·넷째 수요일 14회, 요리 강사와 함께하는 시간은 월 1회 2시간씩 7회.',
    budget: '보조금 2,322,000원. 회원 식재료·요리책 인쇄·이행보증보험료는 모임 회비로 마련한다. 천막·식탁·의자 임차료는 견적을 확인한다.',
    effects: '혼자 드시던 어르신이 이웃과 한 상에서 식사하고, 반찬 14가지가 사진과 조리법으로 남는다. 참여 인원·사진·서명부·마무리 설문으로 돌아본다. 2028년에는 어르신 강사·마을 텃밭·회비로 이어 간다.',
    groupIntro: data.groupIntro,
  },
};
