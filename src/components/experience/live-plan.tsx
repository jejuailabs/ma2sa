'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type FormEvent } from 'react';
import { ArrowDownToLine, ArrowLeft, ArrowRight, AudioLines, Check, ChevronDown, FileText, Leaf, LoaderCircle, Mic, MicOff, RotateCcw, Send, Sparkles, Square, Volume2, X } from 'lucide-react';
import { planQuestions, planSectionLabels, type PlanBasics, type PlanResult } from '@/lib/experience/catalog';
import { appendTranscript, LIVE_MAX_SECONDS, newDraft, nextQuestion, questionKeys, readLiveDraft, welcome, type InterviewDraft, type QuestionKey } from '@/lib/experience/live-plan';
import { currentLiveDraft, liveReady, liveServerReady, liveServerSnapshot, liveSnapshot, subscribeLive, updateLiveDraft } from './live-draft-store';
import { LiveConnection } from './live-connection';
import { planText, saveBlob } from './plan-wizard';

type Configuration = { voice: boolean; text: boolean; needsSession: boolean };
type TurnResult = { answers: string[]; skipped: QuestionKey[]; reply: string; nextKey: QuestionKey | null };
async function post<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error?.message || '연결하지 못했어요. 잠시 후 다시 시도해 주세요.');
  return result as T;
}
const clockText = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
const shortLabels = ['필요성', '사업 대상', '사업 내용', '주민 참여', '추진 일정', '예산 계획', '기대효과', '모임 소개'];

export function LivePlan() {
  const raw = useSyncExternalStore(subscribeLive, liveSnapshot, liveServerSnapshot);
  const ready = useSyncExternalStore(subscribeLive, liveReady, liveServerReady);
  const draft = useMemo(() => readLiveDraft(raw), [raw]);
  const [config, setConfig] = useState<Configuration | null>(null);
  const [consent, setConsent] = useState(false);
  const [input, setInput] = useState('');
  const [connection, setConnection] = useState<'idle' | 'connecting' | 'connected'>('idle');
  const [muted, setMuted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [seconds, setSeconds] = useState(0);
  const [playbackBlocked, setPlaybackBlocked] = useState(false);
  const [focused, setFocused] = useState<QuestionKey | null>(null);
  const [resultOpen, setResultOpen] = useState(false);
  const call = useRef<LiveConnection | null>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const transcript = useRef<HTMLDivElement>(null);
  const inputElement = useRef<HTMLTextAreaElement>(null);
  const revision = useRef(0);
  const lastSavedRevision = useRef(0);
  const turnPromise = useRef<Promise<boolean> | null>(null);
  const queued = useRef(false);
  const delegationIds = useRef(new Set<string>());
  const delegationTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const activeRequests = useRef(new Set<AbortController>());
  const mounted = useRef(true);
  const resultPanel = useRef<HTMLElement>(null);
  const selectedKey = focused || nextQuestion(draft.answers, draft.skipped);
  const completed = draft.answers.filter(Boolean).length;
  const considered = draft.answers.filter((answer, index) => answer.trim() || draft.skipped.includes(questionKeys[index])).length;
  const messages = draft.messages.length ? draft.messages : [{ id: 'welcome', role: 'assistant' as const, text: welcome }];

  useEffect(() => {
    const controller = new AbortController(); const requests = activeRequests.current; mounted.current = true;
    fetch('/api/experience/live/config', { signal: controller.signal }).then(r => r.json()).then(setConfig).catch(() => {});
    const stopOnExit = () => call.current?.close(); window.addEventListener('pagehide', stopOnExit);
    return () => { mounted.current = false; controller.abort(); clearTimeout(delegationTimer.current); call.current?.close(); requests.forEach(c => c.abort()); window.removeEventListener('pagehide', stopOnExit); };
  }, []);
  useEffect(() => { const element = transcript.current; if (element) element.scrollTop = element.scrollHeight; }, [raw, busy]);
  useEffect(() => {
    if (!resultOpen || !resultPanel.current) return;
    const previous = document.activeElement as HTMLElement | null;
    const panel = resultPanel.current;
    const controls = () => Array.from(panel.querySelectorAll<HTMLElement>('button:not(:disabled), input, textarea, a[href]'));
    controls()[0]?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setResultOpen(false);
      if (event.key !== 'Tab') return;
      const list = controls(); const first = list[0]; const last = list[list.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); previous?.focus(); };
  }, [resultOpen]);
  useEffect(() => {
    if (connection !== 'connected') return;
    const started = Date.now();
    const timer = setInterval(() => { const elapsed = Math.floor((Date.now() - started) / 1000); setSeconds(elapsed); if (elapsed >= LIVE_MAX_SECONDS) { call.current?.close(); setNotice('15분 인터뷰가 끝났어요. 다시 연결하거나 글로 이어갈 수 있어요.'); } }, 1000);
    return () => clearInterval(timer);
  }, [connection]);

  async function ensureSession() {
    if (!config) throw new Error('연결 설정을 확인하고 있어요. 잠시 후 다시 시도해 주세요.');
    if (config.needsSession) await post('/api/experience/session', {});
  }
  function changeDraft(fn: (value: InterviewDraft) => InterviewDraft) { revision.current++; updateLiveDraft(value => ({ ...fn(value), result: null })); }
  function addUser(text: string) {
    changeDraft(value => ({ ...value, messages: [...(value.messages.length ? value.messages : [{ id: 'welcome', role: 'assistant' as const, text: welcome }]), { id: crypto.randomUUID(), role: 'user' as const, text, source: 'text' as const }].slice(-80) }));
  }
  async function runTurn(): Promise<boolean> {
    if (turnPromise.current) { queued.current = true; return turnPromise.current; }
    const work = async () => {
      setBusy(true); setError(''); let successful = true;
      do {
        queued.current = false;
        const snapshot = currentLiveDraft(); const version = revision.current;
        if (!snapshot.messages.some(m => m.role === 'user')) break;
        const controller = new AbortController(); activeRequests.current.add(controller);
          const ids = Array.from(delegationIds.current); ids.forEach(id => delegationIds.current.delete(id));
        try {
          await ensureSession();
          const result = await post<TurnResult>('/api/experience/live/turn', { ...snapshot, messages: snapshot.messages, focusedKey: focused || nextQuestion(snapshot.answers, snapshot.skipped), consent: true, revision: version }, controller.signal);
          if (!mounted.current) return false;
          if (version !== revision.current) { ids.forEach(id => delegationIds.current.add(id)); queued.current = true; continue; }
          updateLiveDraft(value => ({ ...value, answers: result.answers, skipped: result.skipped, result: null, messages: call.current ? value.messages : [...value.messages, { id: crypto.randomUUID(), role: 'assistant' as const, text: result.reply, source: 'text' as const }].slice(-80) }));
          lastSavedRevision.current = version; setFocused(null);
          const summary = `앱 저장 완료. 다음 항목: ${result.nextKey || '전체 검토'}. ${result.reply.slice(0, 360)}`;
          if (call.current) {
            if (ids.length) { ids.forEach(id => call.current?.send('session.thinking.append', summary, id)); call.current.send('session.instructions.append', '저장된 결과를 바탕으로 짧게 확인하고 다음 질문을 하나만 하세요. 사용자가 말하는 중이면 끝날 때까지 기다리세요.'); }
            else call.current.send('session.commentary.append', result.reply.slice(0, 360));
          }
        } catch (cause) {
          if (controller.signal.aborted) return false;
          successful = false; setError(cause instanceof Error ? cause.message : '답변을 정리하지 못했어요.');
          ids.forEach(id => call.current?.send('session.thinking.append', '답변 저장에 실패했습니다. 저장했다고 말하지 말고 화면에서 재시도하도록 안내하세요.', id));
        } finally { activeRequests.current.delete(controller); }
      } while (queued.current && mounted.current);
      if (mounted.current) setBusy(false);
      return successful;
    };
    turnPromise.current = work();
    try { return await turnPromise.current; } finally { turnPromise.current = null; if (mounted.current) setBusy(false); }
  }
  async function submit(event?: FormEvent) {
    event?.preventDefault(); if (!consent || !input.trim() || generating || busy) return;
    addUser(input.trim()); setInput(''); await runTurn();
  }
  async function startCall() {
    if (!consent || !audio.current || connection !== 'idle') return;
    setError(''); setNotice(''); setConnection('connecting'); setSeconds(0); setMuted(false);
    const connectionId = crypto.randomUUID();
    const live = new LiveConnection(audio.current, {
      event: event => {
        if (event.type === 'session.input_transcript.delta' || event.type === 'session.output_transcript.delta') {
          const role = event.type === 'session.input_transcript.delta' ? 'user' : 'assistant';
          if (role === 'user') revision.current++;
          updateLiveDraft(value => ({ ...value, messages: appendTranscript(value.messages, role, event.delta || '', event.start_ms || 0, event.end_ms || 0, connectionId), ...(role === 'user' ? { result: null } : {}) }));
          if (role === 'user' && delegationIds.current.size) { clearTimeout(delegationTimer.current); delegationTimer.current = setTimeout(() => { void runTurn(); }, 650); }
        }
        if (event.type === 'session.delegation.created' && event.delegation?.id) {
          delegationIds.current.add(event.delegation.id); clearTimeout(delegationTimer.current);
          delegationTimer.current = setTimeout(() => { void runTurn(); }, 400);
        }
      },
      closed: () => { if (call.current === live) { call.current = null; if (mounted.current) { setConnection('idle'); setMuted(false); } } },
      error: message => { if (mounted.current) setError(message); },
      playbackBlocked: () => setPlaybackBlocked(true),
    });
    call.current = live;
    try {
      await ensureSession();
      await live.start(async (sdp, signal) => post('/api/experience/live/session', { ...currentLiveDraft(), consent: true, sdp }, signal));
      if (call.current !== live || !mounted.current) return;
      setConnection('connected');
      live.send('session.instructions.append', `Greet the caller now in Korean. Begin speaking immediately, then pause and listen. 마을AI사무장의 AI 도우미라고 소개하고 ${currentLiveDraft().answers.some(Boolean) ? '이전에 저장한 내용을 이어서' : '우리 마을에서 바꾸고 싶은 일을'} 한 가지만 질문하세요.`);
    } catch (cause) {
      live.close(); if (call.current === live) call.current = null;
      if (mounted.current) { setConnection('idle'); setError(cause instanceof DOMException && cause.name === 'NotAllowedError' ? '마이크 권한을 허용해 주세요. 글로 답하며 먼저 시작해도 좋아요.' : cause instanceof Error ? cause.message : '음성 연결을 시작하지 못했어요.'); }
    }
  }
  function stopCall() { clearTimeout(delegationTimer.current); call.current?.close(); if (revision.current !== lastSavedRevision.current && currentLiveDraft().messages.some(m => m.role === 'user')) void runTurn(); }
  async function makePlan() {
    if (!consent || generating) return;
    setGenerating(true); setError('');
    const controller = new AbortController(); activeRequests.current.add(controller);
    try {
      call.current?.close(); clearTimeout(delegationTimer.current);
      if (turnPromise.current) await turnPromise.current;
      if (revision.current !== lastSavedRevision.current && currentLiveDraft().messages.some(m => m.role === 'user')) { if (!await runTurn()) return; }
      await ensureSession();
      const version = revision.current;
      const response = await post<{ result: PlanResult }>('/api/experience/live/plan', { ...currentLiveDraft(), consent: true }, controller.signal);
      if (version !== revision.current) throw new Error('작성 중 답변이 바뀌었어요. 최신 답변으로 다시 만들어 주세요.');
      updateLiveDraft(value => ({ ...value, result: response.result })); setResultOpen(true);
    } catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : '계획서를 만들지 못했어요.'); }
    finally { activeRequests.current.delete(controller); if (mounted.current) setGenerating(false); }
  }
  async function download() {
    const value = currentLiveDraft(); if (!value.result) return;
    if (value.basics.type === 'happiness') { saveBlob('행복마을관리소-사업계획서.txt', new Blob([planText(value.basics, value.result)], { type: 'text/plain;charset=utf-8' })); return; }
    setExporting(true); setError('');
    try {
      const response = await fetch('/api/experience/export', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ basics: value.basics, result: value.result }) });
      if (!response.ok) throw new Error('한글 파일을 만들지 못했어요. 다시 시도해 주세요.');
      saveBlob('우리마을-사업계획서.hwpx', await response.blob());
    } catch (cause) { setError(cause instanceof Error ? cause.message : '다운로드하지 못했어요.'); } finally { setExporting(false); }
  }
  function changeBasic(key: keyof PlanBasics, value: string) { changeDraft(d => ({ ...d, basics: { ...d.basics, [key]: value } })); }
  function reset() { if (!window.confirm('이 페이지의 대화와 답변을 지우고 새로 시작할까요?')) return; call.current?.close(); clearTimeout(delegationTimer.current); activeRequests.current.forEach(c => c.abort()); queued.current = false; revision.current++; lastSavedRevision.current = revision.current; delegationIds.current.clear(); updateLiveDraft(() => newDraft()); setFocused(null); setResultOpen(false); setInput(''); setError(''); setNotice('새 인터뷰를 시작할 수 있어요.'); }

  return <div className="lp-page">
    <header className="lp-header"><Link href="/experience" className="lp-brand"><span><Leaf size={20}/></span>마을AI사무장</Link><div className="lp-header-right"><span className="lp-lab">새로운 체험</span><Link href="/experience/business-plan">기존 작성 방식 <ArrowRight size={15}/></Link></div></header>
    <main className="lp-main">
      <section className="lp-intro"><div><p className="lp-eyebrow"><span/> AI 음성 인터뷰</p><h1>이야기하면,<br className="lp-mobile-break"/> 계획서가 됩니다<span>.</span></h1><p className="lp-description">우리 마을의 생각을 편하게 들려주세요.<br/>질문은 제가 할게요. 계획서는 함께 만들어요.</p></div><div className="lp-intro-note"><span>01 이야기 나누기</span><i/><span>02 내용 확인하기</span><i/><span>03 계획서 받기</span></div></section>
      <div className="lp-workspace">
        <section className="lp-conversation" aria-label="AI와 사업계획서 인터뷰">
          <div className="lp-panel-heading"><div><span className={`lp-status-dot ${connection === 'connected' ? 'active' : ''}`}/><strong>우리 마을 이야기</strong><span className="lp-status">{connection === 'connecting' ? '연결하는 중' : connection === 'connected' ? muted ? '마이크 꺼짐' : '음성 연결됨' : '음성 또는 글로 대화'}</span></div><button className="lp-icon-button" onClick={reset} disabled={busy || generating || connection === 'connecting'} aria-label="새 인터뷰 시작"><RotateCcw size={17}/></button></div>
          <div className={`lp-voice-stage ${connection === 'connected' && !muted ? 'is-live' : ''}`}>
            <div className="lp-orb"><div className="lp-orb-core"><AudioLines size={42} strokeWidth={1.3}/></div></div>
            <p>{connection === 'connecting' ? '마이크를 연결하고 있어요' : connection === 'connected' ? muted ? '글로 답해도 잘 들을게요' : '편하게 말씀해 주세요' : '마을의 첫 이야기를 기다리고 있어요'}</p>
            <div className="lp-call-controls">{connection === 'idle' ? <button className="lp-start" onClick={startCall} disabled={!consent || !config?.voice || busy || generating}><Mic size={17}/> 음성으로 대화 시작</button> : <><button className="lp-mute" disabled={connection !== 'connected'} onClick={() => { call.current?.mute(!muted); setMuted(!muted); }}>{muted ? <MicOff size={17}/> : <Mic size={17}/>} {muted ? '마이크 켜기' : '마이크 끄기'}</button><button className="lp-end" onClick={stopCall}><Square size={12} fill="currentColor"/> {connection === 'connecting' ? '연결 취소' : '대화 종료'}</button><span className="lp-timer">{clockText(seconds)}</span></>}</div>
            {playbackBlocked && <button className="lp-text-button" onClick={() => audio.current?.play().then(() => setPlaybackBlocked(false)).catch(() => setError('브라우저의 소리 재생 권한을 확인해 주세요.'))}><Volume2 size={15}/> AI 목소리 재생하기</button>}
          </div>
          <div className="lp-transcript" ref={transcript} role="log" aria-label="대화 내용" aria-live="polite" aria-relevant="additions text">{messages.map(message => <div className={`lp-message ${message.role}`} key={message.id}>{message.role === 'assistant' && <span className="lp-avatar"><Leaf size={15}/></span>}<div><span className="lp-speaker">{message.role === 'assistant' ? '마을AI사무장' : '나'}</span><p>{message.text}</p></div></div>)}{busy && <div className="lp-thinking"><span/><span/><span/> 답변을 정리하고 있어요</div>}</div>
          <div className="lp-composer-area">
            {!draft.messages.length && <div className="lp-suggestions">{['마을회관을 편하게 고치고 싶어요', '어르신 돌봄을 시작하고 싶어요'].map(text => <button key={text} onClick={() => { setInput(text); inputElement.current?.focus(); }}>{text}<ArrowRight size={13}/></button>)}</div>}
            {error && <div className="lp-error" role="alert"><span>{error}</span><button aria-label="안내 닫기" onClick={() => setError('')}><X size={16}/></button></div>}
            {notice && <p className="lp-notice" role="status">{notice}</p>}
            <form className="lp-composer" onSubmit={submit}><textarea ref={inputElement} aria-label="글로 답변하기" placeholder={consent ? '말하기 어려울 땐, 여기에 적어 주세요.' : '아래 이용 동의 후 대화를 시작해 주세요.'} value={input} maxLength={3500} rows={2} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void submit(); } }} disabled={generating}/><button type="submit" aria-label="답변 보내기" disabled={!consent || !input.trim() || busy || generating || !config?.text}>{busy ? <LoaderCircle className="lp-spin" size={20}/> : <Send size={19}/>}</button></form>
            <label className="lp-consent"><input type="checkbox" checked={consent} disabled={connection !== 'idle' || busy || generating} onChange={e => setConsent(e.target.checked)}/><span>음성·답변을 AI에 전달해 인터뷰와 초안 작성에 사용하는 데 동의해요.</span></label><p className="lp-storage-note">대화와 답변은 이 기기에 24시간 저장돼요. AI와 나누는 대화입니다.</p>
            {config && (!config.voice || !config.text) && <p className="lp-notice">{!config.voice ? '음성' : '답변 정리'} 연결을 준비 중이에요. 오른쪽 항목에 직접 내용을 적을 수 있어요.</p>}
            {draft.messages.some(m => m.role === 'user') && error && <button className="lp-text-button" disabled={!consent || busy || generating} onClick={() => void runTurn()}>답변 정리 다시 시도 <ArrowRight size={14}/></button>}
          </div>
        </section>
        <aside className="lp-plan-panel" aria-label="정리된 사업계획서 항목">
          <div className="lp-plan-heading"><span className="lp-file-icon"><FileText size={21}/></span><div><h2>차곡차곡, 사업계획서</h2><p>이야기가 항목별로 정리돼요.</p></div></div>
          <div className="lp-progress-label"><span>{considered === 8 ? '이제 내용을 확인해 주세요' : '함께 채우는 중이에요'}</span><strong>{completed}<small> / 8</small></strong></div><div className="lp-progress" role="progressbar" aria-label="답변 작성 진행" aria-valuemin={0} aria-valuemax={8} aria-valuenow={completed}><span style={{ width: `${completed * 12.5}%` }}/></div>
          <div className="lp-basics"><label>사업 유형<select value={draft.basics.type} disabled={connection !== 'idle' || busy || generating} onChange={e => changeBasic('type', e.target.value)}><option value="community">마을공동체 공간조성</option><option value="happiness">행복마을관리소</option></select></label><label>우리 모임 이름<input value={draft.basics.group} maxLength={15} disabled={generating} placeholder="예: 함께마을 주민모임" onChange={e => changeBasic('group', e.target.value)}/></label></div>
          <div className="lp-outline">{planQuestions.map((q, index) => <details key={q.key} className={selectedKey === q.key ? 'is-current' : ''}><summary onClick={() => setFocused(q.key)}><span className={`lp-number ${draft.answers[index] ? 'done' : ''}`}>{draft.answers[index] ? <Check size={13}/> : String(index + 1).padStart(2, '0')}</span><span>{shortLabels[index]}</span><small>{draft.answers[index] ? '작성됨' : draft.skipped.includes(q.key) ? '나중에' : selectedKey === q.key ? '이야기 중' : ''}</small><ChevronDown size={14}/></summary><p>{q.title}</p><textarea aria-label={`${shortLabels[index]} 답변 수정`} rows={3} placeholder="대화로 채우거나 직접 적어 주세요." value={draft.answers[index]} maxLength={2000} disabled={busy || generating || connection !== 'idle'} onChange={e => { const value = e.target.value; changeDraft(d => ({ ...d, answers: d.answers.map((a, i) => i === index ? value : a), skipped: d.skipped.filter(key => key !== q.key) })); }} onBlur={e => { if (e.target.value.trim()) { lastSavedRevision.current = revision.current; } }}/></details>)}</div>
          <details className="lp-document-info"><summary>예산·문서 기본정보 <ChevronDown size={14}/></summary><p>대표자·주소·연락처는 AI에 보내지 않고 파일에만 넣어요.</p>{([['title', '사업명'], ['grant', '보조금 (원)'], ['contribution', '자부담 (원)'], ['representative', '대표자'], ['address', '주소'], ['phone', '연락처']] as const).map(([key, label]) => <label key={key}>{label}<input disabled={generating} value={draft.basics[key]} maxLength={key === 'grant' || key === 'contribution' ? 13 : 100} onChange={e => changeBasic(key, ['grant', 'contribution'].includes(key) ? e.target.value.replace(/[^\d,]/g, '') : e.target.value)}/></label>)}</details>
          <div className="lp-plan-bottom"><button className="lp-generate" onClick={makePlan} disabled={!ready || !consent || !completed || busy || generating}>{generating ? <LoaderCircle size={18} className="lp-spin"/> : <Sparkles size={18}/>} {generating ? '계획서를 작성하고 있어요' : '이야기로 계획서 만들기'}<ArrowRight size={17}/></button>{draft.result && <button className="lp-result-link" onClick={() => setResultOpen(true)}><FileText size={15}/> 작성된 계획서 열기</button>}<p>모르는 항목은 비워도 괜찮아요.<br/>초안을 만든 뒤에도 자유롭게 고칠 수 있어요.</p></div>
        </aside>
      </div>
      <footer className="lp-footer"><span><Leaf size={14}/> 마을의 가능성을, 한 문장씩.</span><span>AI가 만든 초안은 제출 전 사실관계를 확인해 주세요.</span></footer>
    </main>
    <audio ref={audio} autoPlay playsInline className="lp-audio"/>
    {resultOpen && draft.result && <div className="lp-result-backdrop"><section ref={resultPanel} className="lp-result" role="dialog" aria-modal="true" aria-labelledby="lp-result-title"><header><div><p className="lp-eyebrow">우리 마을의 첫 번째 초안</p><h2 id="lp-result-title">이야기가 계획서가 되었어요.</h2></div><button className="lp-icon-button" aria-label="계획서 닫기" onClick={() => setResultOpen(false)}><X size={22}/></button></header><div className="lp-result-body"><label className="lp-result-title-label">사업명<input value={draft.result.title} maxLength={100} onChange={e => updateLiveDraft(d => ({ ...d, result: d.result ? { ...d.result, title: e.target.value } : null }))}/></label>{Object.entries(planSectionLabels).map(([key, label]) => <label className="lp-result-section" key={key}>{label}<textarea rows={5} maxLength={3000} value={draft.result!.sections[key] || ''} onChange={e => updateLiveDraft(d => ({ ...d, result: d.result ? { ...d.result, sections: { ...d.result.sections, [key]: e.target.value } } : null }))}/></label>)}<p>확인되지 않은 내용은 [입력 필요]로 남겨두었어요. 제출 전 공모 조건과 사실관계를 확인해 주세요.</p></div><footer><button className="lp-mute" onClick={() => setResultOpen(false)}><ArrowLeft size={16}/> 돌아가기</button><button className="lp-mute" onClick={() => saveBlob('사업계획서-초안.txt', new Blob([planText(draft.basics, draft.result!)], { type: 'text/plain;charset=utf-8' }))}><FileText size={16}/> 텍스트</button><button className="lp-start" onClick={download} disabled={exporting}>{exporting ? <LoaderCircle className="lp-spin" size={16}/> : <ArrowDownToLine size={16}/>} {draft.basics.type === 'community' ? '한글 파일 받기' : '계획서 받기'}</button></footer></section></div>}
  </div>;
}
