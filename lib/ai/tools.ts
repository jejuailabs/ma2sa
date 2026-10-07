export const aiToolDefinitions = {
  announcement: {
    title: '공고문 분석',
    description: '공고문 이미지나 PDF에서 신청 조건, 지원 내용, 마감일과 해야 할 일을 추출합니다.',
    accept: 'image/jpeg,image/png,image/webp,application/pdf,text/plain',
    multiple: false,
  },
  receipt: {
    title: '영수증 → 엑셀',
    description: '영수증 사진 여러 장을 품목별 장부 데이터로 정리하고 엑셀 호환 CSV로 내려받습니다.',
    accept: 'image/jpeg,image/png,image/webp',
    multiple: true,
  },
  format: {
    title: '문서 양식 변환',
    description: '메모나 초안을 공식 사업계획서, 신청서, 보고서, 회의록 또는 공지문으로 바꿉니다.',
    accept: '',
    multiple: false,
  },
  transcribe: {
    title: '회의록 자동 정리',
    description: '회의 녹음을 한국어로 받아쓰고 결정 사항과 담당 업무가 포함된 회의록으로 정리합니다.',
    accept: 'audio/mpeg,audio/mp4,audio/wav,audio/x-m4a,audio/webm,.mp3,.m4a,.wav,.webm',
    multiple: false,
  },
  narration: {
    title: '대신 읽어주기',
    description: '안내 내용을 마을 방송 원고로 다듬고 바로 재생할 수 있는 MP3 음성으로 만듭니다.',
    accept: '',
    multiple: false,
  },
} as const;

export type AiToolSlug = keyof typeof aiToolDefinitions;

export function isAiToolSlug(value: string): value is AiToolSlug {
  return value in aiToolDefinitions;
}
