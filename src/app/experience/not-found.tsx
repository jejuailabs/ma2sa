import Link from 'next/link';
export default function NotFound(){return <div className="exp-empty"><h1 className="exp-question-heading">체험 화면을 찾지 못했어요.</h1><p>AI 도구 모음에서 다시 시작해 주세요.</p><Link href="/experience" className="exp-primary-button">체험관으로 돌아가기</Link></div>;}
