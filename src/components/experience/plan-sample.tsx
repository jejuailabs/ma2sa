'use client';

import { NewPlanLink } from './new-plan-link';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ChevronDown, Copy, Download, LoaderCircle, MessageCircle, Sparkles } from 'lucide-react';
import { saeteoSample as sample, sampleBasics, sampleResult } from '@/lib/experience/saeteo-sample';
import { planText, saveBlob } from './plan-wizard';

const steps = ['말한 이야기', '이야기 12칸', '되묻기', '계획서·예산', '심사위원 모드'];

function SampleTable({ headers, rows, caption }: { headers: string[]; rows: string[][]; caption: string }) {
  return <table className="exp-reference-table"><caption>{caption}</caption><thead><tr>{headers.map(label => <th key={label} scope="col">{label}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{row.map((value, cell) => <td key={cell} data-label={headers[cell]}>{value}</td>)}</tr>)}</tbody></table>;
}

export function PlanSample() {
  const [step, setStep] = useState(0);
  const [question, setQuestion] = useState(0);
  const [answerVisible, setAnswerVisible] = useState(false);
  const [title, setTitle] = useState(sampleResult.title);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  const stepNavigation = useRef<HTMLElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
    stepNavigation.current?.querySelector('[aria-current="step"]')?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'instant' });
  }, [step]);
  const result = { ...sampleResult, title };
  const good = sample.review.filter(row => row[1] === '잘됨').length;

  function go(value: number) { setStep(value); setMessage(''); setError(''); }
  async function download() {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/experience/export', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ basics: sampleBasics, result }) });
      if (!response.ok) { const body = await response.json(); throw new Error(body.error?.message || '파일을 만들지 못했어요.'); }
      saveBlob('새터반찬두레-사업계획서-샘플.hwpx', await response.blob());
      setMessage('새터 반찬 두레 샘플을 내려받았어요.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : '파일을 만들지 못했어요.'); }
    finally { setBusy(false); }
  }

  return <>
    <div className="exp-sample-heading"><span className="exp-demo-pill">가상 샘플</span><NewPlanLink href="/experience/business-plan">우리 이야기로 작성 <ArrowRight size={15}/></NewPlanLink></div>
    <h1 ref={heading} tabIndex={-1} className="exp-question-heading">새터 반찬 두레의<br />이야기가 계획서가 되기까지</h1>
    <p className="exp-question-hint">미리 채워 둔 샘플로 작성 과정을 따라가 보세요.</p>
    <nav ref={stepNavigation} className="exp-sample-steps" aria-label="샘플 작성 단계">{steps.map((name, index) => <button key={name} aria-current={step === index ? 'step' : undefined} onClick={() => go(index)}><span>{index + 1}</span>{name}</button>)}</nav>

    {step === 0 && <>
      <section className="exp-sample-intro"><MessageCircle size={25}/><div><h2>편한 말로 한 번에 들려줍니다.</h2><p>“우리 마을은 요즘…” · “하고 싶은 일은…” · “걱정은…”</p></div></section>
      {sample.story.map((story, index) => <blockquote className="exp-sample-story" key={index}><span>{['회장님의 이야기', '총무님의 한마디', '회원님의 한마디'][index]}</span><p>{story}</p></blockquote>)}
      <h2 className="exp-result-title">돌아가며 맡은 일</h2><div className="exp-sample-grid">{sample.roles.map(role => <div className="exp-sample-small-card" key={role}>{role}</div>)}</div>
    </>}

    {step === 1 && <>
      <h2 className="exp-result-title">말한 내용을 12칸에 나눠 담아요.</h2><p className="exp-question-hint">이미 나온 이야기는 다시 묻지 않고, 빈칸만 살펴봅니다.</p>
      <div className="exp-sample-map">{sample.map.map(([number, label, content, status]) => <article className="exp-sample-map-card" key={number}><div><span className="exp-sample-number">{number}</span><h3>{label}</h3><span className={`exp-sample-state ${status.startsWith('✓') ? 'is-good' : 'is-check'}`}>{status.startsWith('✓') ? '✓ 담겼어요' : status.startsWith('△') ? '△ 조금 더' : '○ 비었어요'}</span></div><p>{content}</p></article>)}</div>
    </>}

    {step === 2 && <>
      <div className="exp-step-top"><strong>빈칸만 되묻기 {question + 1} / 4</strong><span>한 번에 하나씩</span></div>
      <section className="exp-sample-followup"><span><MessageCircle size={24}/></span><h2>{sample.followups[question][0]}</h2>{answerVisible ? <div className="exp-sample-answer"><strong>샘플 팀은 이렇게 답했어요</strong><p>{sample.followups[question][1]}</p></div> : <button className="exp-secondary-button" onClick={() => setAnswerVisible(true)}>샘플 팀의 답변 보기 <ChevronDown size={17}/></button>}</section>
      <div className="exp-sample-question-actions"><button className="exp-secondary-button" disabled={question === 0} onClick={() => { setQuestion(question - 1); setAnswerVisible(false); }}><ArrowLeft size={16}/> 이전 질문</button><button className="exp-secondary-button" disabled={question === 3} onClick={() => { setQuestion(question + 1); setAnswerVisible(false); }}>다음 질문 <ArrowRight size={16}/></button></div>
      <p className="exp-help">예산은 “재료 4천 원, 선생님 월 1회…”처럼 말한 내용을 표로 정리해 보여줍니다. 아직 모르는 견적은 [확인]으로 남깁니다.</p>
    </>}

    {step === 3 && <>
      <div className="exp-results-banner"><Check size={25}/><div><h2>이렇게 사업계획서가 됐어요.</h2><p>공동체 활동 · 2027년 2단계 준비 샘플</p></div></div>
      <h2 className="exp-result-title">마음에 드는 사업명을 골라 보세요.</h2>
      <div className="exp-sample-title-options">{sample.titles.map((name, index) => <button key={name} aria-pressed={title === name} onClick={() => setTitle(name)}><span>{index + 1}</span>{name}{title === name && <Check size={18}/>}</button>)}</div>
      <section className="exp-panel exp-sample-document"><p className="exp-eyebrow">1. 신청서</p><h2>{title}</h2><dl><div><dt>지원분야</dt><dd>공동체 활동</dd></div><div><dt>활동분야</dt><dd>복지/돌봄/나눔</dd></div><div><dt>모임명</dt><dd>새터 반찬 두레</dd></div><div><dt>보조금</dt><dd>2,322,000원</dd></div></dl><p>{sampleResult.summary}</p></section>
      <section className="exp-panel exp-sample-document"><p className="exp-eyebrow">2. 사업계획서</p><h2>사업의 목적 및 필요성</h2><p>{sample.purpose}</p></section>
      <SampleTable headers={['사업명', '일정', '사업내용']} rows={sample.schedule} caption="추진계획"/>
      <div className="exp-sample-total"><span>비목별 보조금 예산</span><strong>2,322,000<small>원</small></strong></div>
      <SampleTable headers={['구분', '비목', '금액 (천원)', '세부내역 및 산출기초']} rows={sample.budget} caption="단가 × 인원·수량 × 횟수"/>
      <p className="exp-help">회원 식재료·요리책 인쇄·이행보증보험료는 모임 회비로 마련합니다. 천막·식탁·의자 임차료는 견적을 확인합니다.</p>
      <section className="exp-panel exp-sample-document"><p className="exp-eyebrow">3. 모임소개서</p><h2>새터 반찬 두레</h2><p>{sample.groupIntro}</p><h3>주요 활동 이력</h3><p>{sample.groupHistory}</p><h3>이전 사업비 운영 내역</h3><p>{sample.fundingHistory.map(row => row.join(' · ')).join('\n')}</p></section>
      <p className="exp-help">구성원 서명과 개인정보 동의는 각자 작성하는 칸으로 비워 두었습니다.</p>
      <div className="exp-result-buttons"><button className="exp-primary-button" disabled={busy} onClick={download}>{busy ? <LoaderCircle className="exp-spin" size={18}/> : <Download size={18}/>} 한글 샘플 받기</button><button className="exp-secondary-button" onClick={async () => { try { await navigator.clipboard.writeText(planText(sampleBasics, result)); setMessage('샘플 내용을 복사했어요.'); } catch { setError('복사하지 못했어요. 파일로 내려받아 주세요.'); } }}><Copy size={17}/> 내용 복사</button><a className="exp-secondary-button" href="/experience/business-plan-original.hwpx" download><Download size={17}/> 원본 한글 양식</a></div>
      <a className="exp-text-button exp-sample-source" href="/experience/saeteo-sample.html" download>받은 HTML 샘플 내려받기</a>
    </>}

    {step === 4 && <>
      <section className="exp-sample-intro"><Sparkles size={26}/><div><h2>심사위원이라면 이렇게 물어볼 수 있어요.</h2><p>샘플의 20개 점검 항목 · 잘됨 {good}개 · 고치면 좋음 {20 - good}개</p></div></section>
      {sample.review.map(([label, status, questionText, evidence]) => <details className="exp-review-card exp-sample-review" key={label}><summary><span>{label}</span><span className={`exp-sample-state ${status === '잘됨' ? 'is-good' : 'is-check'}`}>{status === '잘됨' ? '✓' : '△'} {status}</span><ChevronDown size={16}/></summary><p><strong>{questionText}</strong><br/>{evidence}</p></details>)}
      <h2 className="exp-result-title" style={{marginTop:28}}>함께 챙길 네 가지</h2><div className="exp-sample-grid">{sample.tasks.map((task,index) => <article className="exp-sample-small-card" key={task}><span className="exp-sample-number">{index + 1}</span>{task.replace(/^숙제 \d/, '')}</article>)}</div>
      <details className="exp-review-card" style={{marginTop:20}}><summary>샘플의 예산·요건 점검표 <ChevronDown size={18}/></summary><div className="exp-sample-inset"><SampleTable headers={['요건', '값', '샘플 결과']} rows={sample.checks} caption="제공된 샘플에 표시된 점검 결과"/></div></details>
    </>}
    {message && <p className="exp-help" role="status">{message}</p>}{error && <p className="exp-error" role="alert">{error}</p>}
    <div className="exp-footer-actions"><div className="exp-footer-inner">{step > 0 && <button className="exp-secondary-button" onClick={() => go(step - 1)}><ArrowLeft size={17}/> 이전</button>}{step < 4 ? <button className="exp-primary-button" onClick={() => go(step + 1)}>{['12칸으로 정리하기', '빈칸만 되묻기', '계획서 살펴보기', '심사위원 모드 보기'][step]}<ArrowRight size={17}/></button> : <button className="exp-primary-button" onClick={() => go(3)}>계획서·파일 받기로 <ArrowRight size={17}/></button>}</div></div>
  </>;
}
