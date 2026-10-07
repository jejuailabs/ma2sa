import Link from 'next/link';
import { ArrowRight, Check, Mic, ShieldCheck, Sparkles } from 'lucide-react';
import { ExperienceIcon } from '@/components/experience/icon';
import { experienceTools } from '@/lib/experience/catalog';
import { ExperienceQr } from '@/components/experience/qr-share';
import { NewPlanLink } from '@/components/experience/new-plan-link';

export default function ExperiencePage() {
  return <>
    <div className="exp-page-intro"><p className="exp-eyebrow"><span className="exp-status-dot" /> 로그인 없이 무료 체험</p><h1>우리 마을의 일,<br className="exp-mobile-break" /> 조금 더 가볍게.</h1><p>말 한마디, 사진 한 장으로 시작해 보세요.</p></div>
    <section className="exp-plan-hero exp-plan-hero-with-qr" aria-label="사업계획서 체험과 QR 공유">
      <div className="exp-hero-copy">
        <span className="exp-hero-badge"><Sparkles size={14} /> 먼저 체험해 보세요</span>
        <h2>말로 만드는<br />사업계획서</h2>
        <p>무엇부터 써야 할지 막막할 때,<br />질문에 답하는 것부터 시작해요.</p>
        <span className="exp-hero-facts"><span><Check size={15} /> 쉬운 질문 8개</span><span><Check size={15} /> 말하기·직접 입력</span></span>
        <NewPlanLink href="/experience/business-plan" className="exp-hero-cta">우리 마을 계획서 만들기 <ArrowRight size={20} /></NewPlanLink>
        <NewPlanLink mode="live" href="/live-plan" className="exp-live-cta" aria-label="AI와 대화하기" aria-describedby="exp-live-description">
          <span className="exp-live-icon"><ExperienceIcon name="conversation" /></span>
          <span className="exp-live-copy"><strong>AI와 대화하기</strong><small id="exp-live-description">AI가 묻고, 말이나 글로 답해요</small></span>
          <ArrowRight size={18} />
        </NewPlanLink>
        <Link href="/experience/business-plan/sample" className="exp-hero-sample-link">새터 반찬 두레 샘플 보기 <ArrowRight size={15}/></Link>
      </div>
      <ExperienceQr />
      <div className="exp-hero-art" aria-hidden="true"><span className="exp-art-caption">생각을 말하면, 계획이 됩니다</span><div className="exp-art-mic"><Mic size={35} /><div className="exp-art-waves">{[12,23,32,18,40,28,16,33,24,12].map((height,i) => <i key={i} style={{height}} />)}</div></div><div className="exp-art-document"><span className="exp-art-check"><Check size={16} /></span><strong>우리 마을 사업계획서</strong><span /><span /><span /><div><i /><i /></div><small>함께 만드는 더 나은 내일</small></div><span className="exp-art-dot exp-art-dot-one" /><span className="exp-art-dot exp-art-dot-two" /></div>
    </section>
    <div className="exp-section-heading"><div><p className="exp-eyebrow">마을 업무 도우미</p><h2>이런 일도 도와드려요</h2></div><span>한 번씩 가볍게 체험</span></div>
    <div className="exp-tool-grid">{experienceTools.slice(1).map((tool,i) => <Link href={`/experience/tools/${tool.slug}`} key={tool.slug} className="exp-tool-card"><span className={`exp-tool-icon exp-tool-color-${i}`}><ExperienceIcon name={tool.icon} /></span><span className="exp-tool-tag">{tool.tag}</span><h3>{tool.title}</h3><p>{tool.description}</p><ArrowRight className="exp-tool-arrow" size={18} /></Link>)}<Link href="/experience/village/dashboard" className="exp-tool-card exp-village-card"><span className="exp-tool-icon"><ExperienceIcon name="home" /></span><span className="exp-tool-tag">마을 운영 데모</span><h3>우리 마을 둘러보기</h3><p>소식부터 일정과 자금까지, 한곳에서 살펴보세요.</p><ArrowRight className="exp-tool-arrow" size={18} /></Link></div>
    <div className="exp-privacy-note"><ShieldCheck size={19} /><p>민감한 개인정보는 입력하지 마세요. AI 처리 시 입력한 자료가 AI 서비스로 전달됩니다. 마을 화면은 예시 데이터입니다.</p></div>
  </>;
}
