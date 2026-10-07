'use client';
import Link from 'next/link';
export default function ExperienceError({reset}:{reset:()=>void}){return <div className="exp-empty" role="alert"><h1 className="exp-question-heading">화면을 불러오지 못했어요.</h1><p>잠시 후 다시 시도해 주세요. 이 기기에 저장된 답변은 이어서 불러올 수 있습니다.</p><button className="exp-primary-button" onClick={reset}>다시 시도</button><Link href="/experience" className="exp-secondary-button" style={{marginLeft:10}}>체험관으로</Link></div>;}
