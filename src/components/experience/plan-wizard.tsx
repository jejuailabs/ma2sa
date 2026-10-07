'use client';
import Link from 'next/link';
import { PlanDetails } from './plan-details';
import { ManualPlanCopy, usePlanSharing } from './plan-sharing';

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type SetStateAction } from 'react';
import { ArrowLeft, ArrowRight, Check, ChevronDown, Copy, Download, LoaderCircle, Mic, PencilLine, RotateCcw, Share2, ShieldCheck, Sparkles, Square } from 'lucide-react';
import { blankBasics, budgetSummary, planQuestions, planLabels, planFilename, operationLabels, type PlanBasics, type PlanResult } from '@/lib/experience/catalog';
import { ExperienceIcon } from './icon';
import { clientReady,serverReady,draftSnapshot,serverDraftSnapshot,subscribeDraft,readDraft,updateDraft } from './draft-store';

type RecognitionResult = { isFinal: boolean; 0: { transcript: string } };
type Recognition = { lang: string; continuous: boolean; interimResults: boolean; onresult: ((event: { resultIndex: number; results: ArrayLike<RecognitionResult> }) => void) | null; onerror: ((event: { error: string }) => void) | null; onend: (() => void) | null; start: () => void; stop: () => void; abort: () => void };
type SpeechWindow = Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
export function planText(basics: PlanBasics, result: PlanResult) {
  const budget = budgetSummary(basics);
  const schedule = result.scheduleRows?.map(row => `${row.name} | ${row.when}\n${row.content}`).join('\n\n') || '';
  const expenses = result.budgetRows?.map(row => `${row.name} · ${row.category} · ${row.amount === null ? '' : row.amount.toLocaleString('ko-KR') + '원'}\n${row.basis}`).join('\n\n') || '';
  return `${result.title}\n\n사업 유형: ${basics.type === 'community' ? result.supportArea === 'activity' ? '마을공동체 활동' : result.supportArea === 'space' ? '마을공동체 공간조성' : '마을공동체' : '행복마을관리소'}\n${basics.type === 'happiness' ? '관리소명' : '모임명'}: ${basics.group || ''}\n주소: ${basics.address || ''}\n${basics.type === 'happiness' ? '담당자' : '대표자'}: ${basics.representative || ''}\n연락처: ${basics.phone || ''}\n${basics.type === 'happiness' ? '사업비' : '보조금'}: ${budget.grant?.toLocaleString('ko-KR') ?? ''}원\n${basics.type === 'happiness' ? '기타 재원' : '자부담'}: ${budget.contribution?.toLocaleString('ko-KR') ?? ''}원\n\n${Object.entries(planLabels(basics.type)).map(([key,label]) => `${label}\n${result.sections[key] || ''}`).join('\n\n')}${schedule ? '\n\n추진계획 표\n' + schedule : ''}${expenses ? '\n\n비목별 예산표\n' + expenses : ''}\n\n${basics.type === 'happiness' ? Object.entries(operationLabels).map(([key,label]) => label + '\n' + (result.operation?.[key as keyof typeof operationLabels] || '')).join('\n\n') + '\n\n' : ''}${result.history ? '주요 활동 이력\n' + result.history + '\n\n' : ''}초안입니다. 사실관계와 공모 조건을 확인해 주세요.`;
}
export function saveBlob(name: string, blob: Blob) { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 30000); }

export function PlanWizard() {
  const rawDraft=useSyncExternalStore(subscribeDraft,draftSnapshot,serverDraftSnapshot);
  const ready=useSyncExternalStore(subscribeDraft,clientReady,serverReady);
  const {basics,answers,step,result}=useMemo(()=>readDraft(rawDraft),[rawDraft]);
  const setBasics=(value:SetStateAction<PlanBasics>)=>updateDraft(current=>({...current,basics:typeof value==='function'?value(current.basics):value}));
  const setAnswers=(value:SetStateAction<string[]>)=>updateDraft(current=>({...current,answers:typeof value==='function'?value(current.answers):value}));
  const setStep=(value:number)=>updateDraft(current=>({...current,step:value}));
  const setResult=(value:PlanResult|null)=>updateDraft(current=>({...current,result:value}));
  const [consent,setConsent] = useState(false);
  const [running,setRunning] = useState(false);
  const [listening,setListening] = useState(false);
  const [seconds,setSeconds] = useState(0);
  const [message,setMessage] = useState('');
  const [error,setError] = useState('');
  const [exporting,setExporting] = useState(false);
  const sharing = usePlanSharing(result ? {title:result.title,text:planText(basics,result)} : null, setMessage, setError);
  const recognition = useRef<Recognition|null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const answerInput = useRef<HTMLTextAreaElement>(null);
  const interval = useRef<ReturnType<typeof setInterval>|null>(null);
  const budget = budgetSummary(basics);
  const questionIndex = step - 1;
  const question = planQuestions[questionIndex];

  useEffect(() => () => { recognition.current?.abort(); if (interval.current) clearInterval(interval.current); }, []);
  const hasResult=result!==null;
  useEffect(() => { if (!ready) return; heading.current?.focus({preventScroll:true}); window.scrollTo({top:0,behavior:'instant'}); }, [ready,step,hasResult]);

  function stopVoice() { recognition.current?.stop(); setListening(false); if (interval.current) { clearInterval(interval.current); interval.current = null; } }
  function updateAnswer(value: string) { setAnswers(current => current.map((answer,index) => index === questionIndex ? value.slice(0,2000) : answer)); }
  function go(next: number) { stopVoice(); setError(''); setMessage(''); setStep(next); }
  function startVoice() {
    if (listening) { stopVoice(); return; }
    const speech = window as SpeechWindow;
    const Constructor = speech.SpeechRecognition || speech.webkitSpeechRecognition;
    if (!Constructor) { setMessage('이 브라우저에서는 마이크 버튼을 사용할 수 없어요. 직접 입력하거나 휴대폰 키보드의 음성 입력을 이용해 주세요.'); answerInput.current?.focus(); return; }
    recognition.current?.abort();
    const instance = new Constructor();
    recognition.current = instance;
    instance.lang = 'ko-KR'; instance.continuous = true; instance.interimResults = true;
    const original = answers[questionIndex].trim();
    instance.onresult = event => { let recognized = ''; for(let i=0;i<event.results.length;i++) recognized += event.results[i][0].transcript; updateAnswer([original,recognized.trim()].filter(Boolean).join(' ')); };
    instance.onerror = event => { stopVoice(); setMessage(event.error === 'not-allowed' ? '마이크 권한이 필요해요. 브라우저 설정에서 허용하거나 직접 입력해 주세요.' : event.error === 'no-speech' ? '목소리를 듣지 못했어요. 다시 말하거나 직접 입력해 주세요.' : '음성 입력이 중단됐어요. 받아쓴 내용을 확인하고 다시 시도해 주세요.'); };
    instance.onend = () => { setListening(false); if(interval.current) {clearInterval(interval.current); interval.current=null;} };
    try { setMessage(''); setSeconds(0); instance.start(); setListening(true); let elapsed=0; interval.current=setInterval(() => { elapsed++; setSeconds(elapsed); if(elapsed>=60) stopVoice(); },1000); } catch { stopVoice(); setMessage('마이크를 시작하지 못했어요. 직접 입력으로 이어갈 수 있습니다.'); }
  }
  function basic(field: keyof PlanBasics, value: string) { setBasics(current => ({...current,[field]:value})); }
  async function generate() {
    if (!consent || running) return;
    stopVoice(); setRunning(true); setError(''); setMessage('');
    try { const session = await fetch('/api/experience/session',{method:'POST'}); const sessionPayload = await session.json(); if (!session.ok) throw new Error(sessionPayload.error?.message || '체험을 시작하지 못했어요.'); const response = await fetch('/api/experience/business-plan',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({basics,answers})}); const payload = await response.json(); if (!response.ok || !payload.result) throw new Error(payload.error?.message || '계획서를 정리하지 못했어요.'); setResult(payload.result); } catch(cause) { setError(cause instanceof Error ? cause.message : '잠시 후 다시 시도해 주세요. 답변은 그대로 남아 있어요.'); } finally {setRunning(false);} }
  async function downloadHwpx() { if(!result)return; setExporting(true); setError(''); try { const response=await fetch('/api/experience/export',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({basics,result})}); if(!response.ok) {const payload=await response.json();throw new Error(payload.error?.message || '한글 파일을 만들지 못했어요.');} saveBlob(planFilename(basics.type),await response.blob());setMessage('한글 파일을 내려받았어요. 제출 전 내용과 페이지 배치를 확인해 주세요.'); }catch(cause){setError(cause instanceof Error?cause.message:'다운로드에 실패했어요.');}finally{setExporting(false);} }
  function reset() { if(!window.confirm('이 기기에 저장된 답변과 계획서 초안을 지울까요?'))return; stopVoice(); updateDraft(()=>({version:1,expires:0,basics:blankBasics,answers:Array(8).fill(''),result:null,step:0}));setConsent(false);setMessage('저장된 답변을 지웠어요.');setError(''); }
  if(!ready) return <div className="exp-loading"><LoaderCircle className="exp-spin" /> 답변을 준비하고 있어요.</div>;

  if(result) return <>
    <div className="exp-results-banner"><Check size={25} /><div><h1 ref={heading} tabIndex={-1}>우리 마을의 계획이<br />한 걸음 구체적이 됐어요.</h1><p>AI가 정리한 초안입니다. 아래에서 바로 고칠 수 있어요.</p></div></div>
    <label className="exp-field">사업명<input value={result.title} maxLength={100} onChange={event=>setResult({...result,title:event.target.value})} /></label>
    <div className="exp-help">{basics.type==='happiness'?'관리소명':'모임명'}: {basics.group || '입력 필요'} · 총사업비: {budget.total?.toLocaleString('ko-KR') ?? '확인 필요'}원{basics.type==='community' && budget.ratio !== null ? ` · 자부담 ${budget.ratio}%` : ''}</div>
    {Object.entries(planLabels(basics.type)).map(([key,label])=><details className="exp-review-card" key={key} open><summary>{label}<ChevronDown size={17}/></summary><label className="exp-field"><span className="sr-only">{label} 수정</span><textarea value={result.sections[key]||''} maxLength={3000} onChange={event=>setResult({...result,sections:{...result.sections,[key]:event.target.value}})} /></label></details>)}
    <PlanDetails type={basics.type} result={result} onChange={setResult}/>
    <div className="exp-result-buttons">{sharing.supported && <button className="exp-primary-button" disabled={sharing.busy} onClick={sharing.share}><Share2 size={17}/> 기기 공유 메뉴</button>}<button className={sharing.supported?'exp-secondary-button':'exp-primary-button'} disabled={sharing.busy} onClick={sharing.copy}><Copy size={17}/> 내용 복사</button><button className="exp-secondary-button" onClick={()=>saveBlob('사업계획서-초안.txt',new Blob([planText(basics,result)],{type:'text/plain;charset=utf-8'}))}><Download size={17}/> 글 파일 받기</button><button className="exp-secondary-button" disabled={exporting} onClick={downloadHwpx}>{exporting?<LoaderCircle className="exp-spin" size={17}/>:<Download size={17}/>} 한글 파일 받기</button></div>
    <p className="exp-help">{sharing.supported ? '‘기기 공유 메뉴’에서는 이 기기에 표시되는 앱을 선택합니다. 카카오톡이 표시되지 않으면 ‘내용 복사’ 후 카카오톡을 직접 열어 붙여넣어 주세요.' : '이 브라우저에서는 기기 공유 메뉴를 사용할 수 없어요. 카카오톡으로 보내려면 ‘내용 복사’를 누르고 카카오톡 대화창에 직접 붙여넣어 주세요.'}</p>
    <ManualPlanCopy text={sharing.manualText} onClose={sharing.closeManual}/>
    {basics.type==='happiness'&&<p className="exp-help">행복마을관리소 한글 파일은 가평군 마을공동체 통합지원센터의 사업 안내를 참고해 구성한 작성용 양식입니다.</p>}
    <p className="exp-help">이 초안은 이 기기에 임시 저장됩니다. 공용 기기에서는 체험 후 ‘답변 지우기’를 눌러 주세요.</p>
    {message&&<p className="exp-help" role="status">{message}</p>}{error&&<p className="exp-error" role="alert">{error}</p>}
    <div className="exp-footer-actions"><div className="exp-footer-inner"><button className="exp-secondary-button" onClick={()=>{setResult(null);go(9);}}><PencilLine size={17}/> 답변 수정</button><button className="exp-text-button" onClick={reset}><RotateCcw size={15} style={{display:'inline',marginRight:5}}/>답변 지우기</button></div></div>
  </>;

  return <>
    <div className="exp-step-top"><strong>{step===0?'시작하기':step===9?'마지막 확인':`질문 ${step} / 8`}</strong><span>아는 만큼만 답해 주세요</span></div><div className="exp-progress" role="progressbar" aria-label="사업계획서 작성 진행" aria-valuemin={0} aria-valuemax={10} aria-valuenow={step+1}><span style={{width:`${(step+1)*10}%`}}/></div>
    {step===0 ? <>
      <h1 ref={heading} tabIndex={-1} className="exp-question-heading">우리 마을의 생각을<br />계획서로 만들어 볼까요?</h1><p className="exp-question-hint">어려운 문장 대신 편한 말로 답해 주세요.<br />모르는 내용은 나중에 채워도 괜찮아요.</p>
      <Link href="/experience/business-plan/sample" className="exp-sample-entry"><Sparkles size={22}/><span><strong>새터 반찬 두레 샘플로 먼저 체험하기</strong><small>이야기 12칸부터 예산표·심사위원 모드까지</small></span><ArrowRight size={18}/></Link>
      <div className="exp-choice-grid">{([{type:'community',title:'마을공동체',hint:'공간을 가꾸고 주민 활동을 함께해요.',icon:'home'},{type:'happiness',title:'행복마을관리소',hint:'생활 불편을 해결하고 이웃을 돌봐요.',icon:'users'}] as const).map(item=><button className="exp-choice" aria-pressed={basics.type===item.type} key={item.type} onClick={()=>basic('type',item.type)}><ExperienceIcon name={item.icon}/><span><strong>{item.title}</strong><small>{item.hint}</small></span>{basics.type===item.type&&<Check className="exp-choice-check" size={19}/>}</button>)}</div>
      <div className="exp-input-group"><label className="exp-field">{basics.type==='happiness'?'관리소 이름':'모임 이름'} <small>선택 · 15자 이내</small><input autoComplete="organization" maxLength={15} value={basics.group} onChange={event=>basic('group',event.target.value)} placeholder="예: 함께마을 주민모임" /></label><label className="exp-field">사업 이름 <small>선택 · 생각나는 이름이 있으면 적어 주세요</small><input maxLength={100} value={basics.title} onChange={event=>basic('title',event.target.value)} placeholder="예: 함께 쉬는 마을회관 만들기" /></label></div>
      <div className="exp-help"><ShieldCheck size={17} style={{display:'inline',marginRight:6}}/>음성 입력은 브라우저의 인식 서비스를 이용할 수 있어요. 주민등록번호 등 민감한 정보는 말하거나 입력하지 마세요.</div>
    </> : step<=8 ? <>
      <h1 ref={heading} tabIndex={-1} className="exp-question-heading">{question.title}</h1><p className="exp-question-hint">{basics.type==='happiness'&&questionIndex===2 ? '생활 지원, 안전 확인, 이웃 돌봄 등 계획하는 활동을 말해 주세요.' : question.hint}</p>
      <div className="exp-voice-box"><button className={`exp-mic-button ${listening?'is-listening':''}`} aria-label={listening?'음성 입력 멈추기':'음성으로 답하기'} aria-pressed={listening} onClick={startVoice}>{listening?<Square/>:<Mic/>}</button><strong>{listening?`듣고 있어요 · ${seconds}초`:'눌러서 편하게 말해 주세요'}</strong><p>{listening?'다 말했으면 버튼을 한 번 더 눌러 주세요.':'직접 글로 입력해도 괜찮아요.'}</p></div>
      <div className="exp-input-label-row"><label htmlFor="plan-answer">내 답변</label><button onClick={()=>{stopVoice();answerInput.current?.focus();}}><PencilLine size={14} style={{display:'inline',marginRight:5}}/> 직접 입력</button></div><textarea id="plan-answer" ref={answerInput} className="exp-answer" value={answers[questionIndex]} maxLength={2000} onChange={event=>{if(listening)stopVoice();updateAnswer(event.target.value);}} placeholder="말한 내용이 여기에 나타나요. 자유롭게 고칠 수 있어요."/><p className="exp-char-count">{answers[questionIndex].length.toLocaleString()} / 2,000자</p><div className="exp-example"><strong>이렇게 말해도 좋아요</strong>{basics.type==='happiness'&&questionIndex===2?'어르신 안부를 주 2회 확인하고, 위험한 골목길을 함께 점검하고 싶어요.':question.example}</div>
    </> : <>
      <h1 ref={heading} tabIndex={-1} className="exp-question-heading">답변을 확인하고<br />계획서로 정리해요.</h1><p className="exp-question-hint">모르는 항목은 빈칸으로 남겨둡니다. 금액과 연락처는 아는 경우에만 적어 주세요.</p>
      {planQuestions.map((q,index)=><details className="exp-review-card" key={q.key}><summary>{index+1}. {q.title}{!answers[index].trim()&&<small>나중에 입력</small>}<ChevronDown size={17}/></summary><label className="exp-field"><span className="sr-only">{q.title}</span><textarea maxLength={2000} value={answers[index]} onChange={event=>setAnswers(current=>current.map((value,i)=>i===index?event.target.value:value))}/></label></details>)}
      <div className="exp-input-group"><label className="exp-field">{basics.type==='happiness'?'관리소 주소':'공간 또는 모임 주소'}<input autoComplete="street-address" maxLength={200} value={basics.address} onChange={event=>basic('address',event.target.value)} placeholder="선택 · 도로명 주소"/></label><label className="exp-field">{basics.type==='happiness'?'담당자 이름':'대표자 이름'}<input maxLength={50} value={basics.representative} onChange={event=>basic('representative',event.target.value)} placeholder="선택 · 문서에만 기재"/></label><label className="exp-field">연락처<input type="tel" autoComplete="tel" maxLength={30} value={basics.phone} onChange={event=>basic('phone',event.target.value)} placeholder="선택 · 문서에만 기재"/></label><div className="exp-input-pair"><label className="exp-field">{basics.type==='happiness'?'사업비 (원)':'보조금 (원)'}<input inputMode="numeric" value={basics.grant} maxLength={13} onChange={event=>basic('grant',event.target.value.replace(/[^\d,]/g,''))} placeholder="예: 3000000"/></label><label className="exp-field">{basics.type==='happiness'?'기타 재원 (원)':'자부담 (원)'}<input inputMode="numeric" value={basics.contribution} maxLength={13} onChange={event=>basic('contribution',event.target.value.replace(/[^\d,]/g,''))} placeholder="예: 150000"/></label></div></div>
      {budget.total!==null&&<p className="exp-help">총사업비 {budget.total.toLocaleString('ko-KR')}원{basics.type==='community'&&budget.ratio!==null?` · 보조금 대비 자부담 ${budget.ratio}%`:''}. 지원 조건은 해당 사업 공고에서 확인해 주세요.</p>}
      <label className="exp-consent"><input type="checkbox" checked={consent} onChange={event=>setConsent(event.target.checked)}/><span>답변과 모임명·사업명을 AI 서비스에 전달하여 초안을 만드는 데 동의합니다. 주소·대표자·연락처는 AI에 보내지 않고 파일 작성에 사용합니다.</span></label>
      <p className="exp-help">체험은 기기 세션별로 이용량이 제한됩니다. 자동 제출되지 않으며, 제출 전 공모 조건과 사실관계를 확인해 주세요.</p>
    </>}
    {message&&<p className="exp-help" role="status">{message}</p>}{error&&<p className="exp-error" role="alert">{error}</p>}{running&&<p className="exp-loading" role="status"><LoaderCircle className="exp-spin" size={20}/> 답변을 항목별로 정리하고 있어요. 잠시만 기다려 주세요.</p>}
    <div className="exp-footer-actions"><div className="exp-footer-inner">{step>0&&<button className="exp-secondary-button" disabled={running} onClick={()=>go(step-1)}><ArrowLeft size={17}/> 이전</button>}{step<9?<button className="exp-primary-button" onClick={()=>go(step+1)}>{step===0?'시작하기':step===8?'답변 확인하기':'다음'}<ArrowRight size={18}/></button>:<button className="exp-primary-button" disabled={!consent||running||!answers.some(answer=>answer.trim())} onClick={generate}>{running?<LoaderCircle className="exp-spin" size={19}/>:<Sparkles size={18}/>} {running?'정리 중이에요':'AI로 계획서 만들기'}</button>}</div></div>
  </>;
}
