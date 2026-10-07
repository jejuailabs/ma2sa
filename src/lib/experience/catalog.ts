export const experienceTools = [
  { slug: 'business-plan', title: '말로 만드는 사업계획서', description: '질문에 답하면 우리 마을의 생각이 계획서가 됩니다.', tag: '추천 체험', icon: 'mic' },
  { slug: 'announcement', title: '공고문 분석', description: '지원 조건과 마감일을 한눈에 확인해요.', tag: '문서 · 사진', icon: 'scan' },
  { slug: 'receipt', title: '영수증 정리', description: '영수증 사진을 간단한 장부로 바꿔요.', tag: '사진', icon: 'receipt' },
  { slug: 'format', title: '문서 양식 변환', description: '짧은 메모를 정돈된 문서로 만들어요.', tag: '글 입력', icon: 'file' },
  { slug: 'transcribe', title: '회의록 정리', description: '녹음에서 결정 사항과 할 일을 정리해요.', tag: '녹음 파일', icon: 'audio' },
  { slug: 'narration', title: '대신 읽어주기', description: '안내 문장을 마을 방송 음성으로 만들어요.', tag: '글 · 음성', icon: 'speaker' },
] as const;

export const villageSections = [
  { slug: 'dashboard', title: '마을 대시보드', icon: 'home' },
  { slug: 'news', title: '마을 소식', icon: 'news' },
  { slug: 'residents', title: '마을 주민', icon: 'users' },
  { slug: 'schedule', title: '일정 관리', icon: 'calendar' },
  { slug: 'funds', title: '자금 관리', icon: 'wallet' },
  { slug: 'documents', title: '문서함', icon: 'folder' },
] as const;

export const planQuestions = [
  { key: 'need', title: '우리 마을에서 무엇을 바꾸고 싶나요?', hint: '불편한 점이나 함께 해결하고 싶은 일을 편하게 말해 주세요.', example: '마을회관이 낡아서 어르신들이 편하게 쉬실 공간이 부족해요.' },
  { key: 'target', title: '누구를 위한 일인가요?', hint: '어떤 주민에게 도움이 될지 알려 주세요. 인원을 알면 함께 적어 주세요.', example: '마을 어르신과 아이들이 함께 이용하면 좋겠어요.' },
  { key: 'activities', title: '어떤 일을 할 건가요?', hint: '공간을 고치거나 함께 할 활동을 말해 주세요.', example: '회관 벽을 칠하고, 수리한 공간에서 주 1회 주민 모임을 열고 싶어요.' },
  { key: 'participation', title: '주민들은 어떻게 참여하나요?', hint: '함께 준비하고 맡을 일을 알려 주세요.', example: '주민들이 청소와 페인트칠에 참여하고, 모임 운영도 돌아가며 맡아요.' },
  { key: 'schedule', title: '언제, 몇 번 진행하나요?', hint: '시작과 마무리 시기, 모임 횟수를 아는 만큼 말해 주세요.', example: '다음 달에 수리하고, 이후에는 매주 한 번씩 모이고 싶어요.' },
  { key: 'budget', title: '무엇을 사고, 누구를 부르나요?', hint: '재료, 강사, 공사비 등 필요한 항목과 금액을 알려 주세요.', example: '페인트와 청소 도구가 필요해요. 정확한 가격은 견적을 받아봐야 해요.' },
  { key: 'effects', title: '끝나면 무엇이 달라질까요?', hint: '주민들의 생활이나 마을에 생길 변화를 말해 주세요.', example: '어르신들이 편하게 쉬고, 주민들이 더 자주 만나게 될 거예요.' },
  { key: 'groupIntro', title: '우리 모임을 소개해 주세요.', hint: '모이게 된 계기와 지금까지 함께 한 일을 알려 주세요.', example: '주민 10명이 작년부터 모여 마을 청소와 어르신 안부 확인을 해왔어요.' },
] as const;

export type PlanBasics = { type: 'community' | 'happiness'; group: string; title: string; address: string; representative: string; phone: string; grant: string; contribution: string };
export type PlanResult = { title: string; sections: Record<string, string> };
export const planSectionLabels: Record<string, string> = { purpose: '사업의 목적 및 필요성', target: '사업 대상', activities: '사업 내용 및 활용계획', participation: '주민 참여 계획', schedule: '사업추진 일정', budget: '예산 계획', effects: '기대효과', groupIntro: '모임 소개' };
export const blankBasics: PlanBasics = { type: 'community', group: '', title: '', address: '', representative: '', phone: '', grant: '', contribution: '' };

export function budgetSummary(basics: PlanBasics) {
  const parse = (value: string) => { const clean = value.replaceAll(',', '').trim(); return /^\d{1,10}$/.test(clean) ? Number(clean) : null; };
  const grant = parse(basics.grant);
  const contribution = parse(basics.contribution);
  return { grant, contribution, total: grant != null && contribution != null ? grant + contribution : null, ratio: grant != null && grant > 0 && contribution != null ? Math.round(contribution / grant * 10000) / 100 : null };
}
