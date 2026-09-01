'use client';

import React, { useState, useRef } from 'react';
import { Mic, Loader2, Copy, Check, Download, Upload, Play, Pause, CalendarDays, MapPin, Users, ListChecks, CheckCircle2, CircleAlert, ChevronDown } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { saveAITask, updateAITask } from '@/lib/firebase/firestore';
import { useAuth } from '@/hooks/useAuth';

const EMPTY_VALUE = '확인 필요';

type MeetingDashboard = {
  date: string;
  place: string;
  attendees: string;
  agendas: string[];
  decisions: string[];
  followUps: string[];
};

function cleanMeetingText(value: string) {
  return value.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').replace(/\*\*(.*?)\*\*/g, '$1').trim();
}

function getMeetingSection(text: string, title: string) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((line) => new RegExp(`^\\s*■\\s*${title}\\s*$`).test(line));
  if (start < 0) return [] as string[];
  const end = lines.findIndex((line, index) => index > start && /^\s*■\s+/.test(line));
  return lines.slice(start + 1, end < 0 ? undefined : end);
}

function readMeetingField(lines: string[], label: string) {
  const match = lines.find((line) => new RegExp(`^\\s*[-*•]?\\s*${label}\\s*[:：]\\s*(.+)$`).test(line));
  return match ? cleanMeetingText(match.split(/[:：]/).slice(1).join(':')) : EMPTY_VALUE;
}

function readMeetingList(lines: string[]) {
  return lines
    .filter((line) => /^\s*(?:[-*•]|\d+[.)])\s+/.test(line))
    .map(cleanMeetingText)
    .filter(Boolean);
}

function extractMeetingDashboard(text: string): MeetingDashboard {
  const info = getMeetingSection(text, '회의 정보');
  return {
    date: readMeetingField(info, '일시'),
    place: readMeetingField(info, '장소'),
    attendees: readMeetingField(info, '참석자'),
    agendas: readMeetingList(getMeetingSection(text, '회의 안건')),
    decisions: readMeetingList(getMeetingSection(text, '결정 사항 요약')),
    followUps: readMeetingList(getMeetingSection(text, '기타 사항')),
  };
}

export default function TranscribePage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const taskIdRef = useRef('');

  const [file, setFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [playing, setPlaying] = useState(false);

  const [transcript, setTranscript] = useState('');
  const [summary, setSummary] = useState('');
  const [step, setStep] = useState<'upload' | 'transcribing' | 'transcript' | 'summarizing' | 'result'>('upload');
  const [error, setError] = useState('');
  const [copiedRaw, setCopiedRaw] = useState(false);
  const [copiedResult, setCopiedResult] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const documentRef = useRef<HTMLDivElement>(null);

  const startTask = async (inputText: string, status: 'draft' | 'processing', stage: string) => {
    try {
      if (taskIdRef.current) {
        await updateAITask(id, taskIdRef.current, { inputText, status, stage, errorMessage: '' });
        return taskIdRef.current;
      }
      const taskId = await saveAITask(id, {
        type: 'transcribe', title: `회의록 정리${file ? ` (${file.name})` : ''}`, inputText, inputImages: [], outputText: '', outputData: null,
        createdBy: user?.uid || '', status, stage, errorMessage: '',
      });
      taskIdRef.current = taskId;
      return taskId;
    } catch {
      return '';
    }
  };

  const handleFile = (f: File) => {
    taskIdRef.current = '';
    setFile(f);
    setError('');
    setTranscript('');
    setSummary('');
    setStep('upload');
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(URL.createObjectURL(f));
    setPlaying(false);
    void startTask(`첨부 음성 파일: ${f.name}`, 'draft', '음성 인식 대기');
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); } else { audioRef.current.play(); }
    setPlaying(!playing);
  };

  const transcribeAudio = async () => {
    if (!file) return;
    setError('');
    setStep('transcribing');
    try {
      const taskId = await startTask(`첨부 음성 파일: ${file.name}`, 'processing', '음성을 텍스트로 변환 중...');
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/ai/stt', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (!data.text?.trim()) throw new Error('음성에서 텍스트를 추출할 수 없었습니다. 다른 파일을 시도해주세요.');
      setTranscript(data.text);
      setStep('transcript');
      try { await updateAITask(id, taskId, { inputText: data.text, status: 'draft', stage: '원문 텍스트 추출 완료 - 회의록 정리 대기' }); } catch {}
    } catch (e) {
      const message = e instanceof Error ? e.message : '음성 인식에 실패했습니다.';
      setError(message);
      try { if (taskIdRef.current) await updateAITask(id, taskIdRef.current, { status: 'failed', stage: '음성 인식 실패', errorMessage: message }); } catch {}
      setStep('upload');
    }
  };

  const directInput = () => {
    taskIdRef.current = '';
    setTranscript('');
    setStep('transcript');
    void startTask('', 'draft', '회의 내용 입력 중');
  };

  const generateSummary = async () => {
    if (!transcript.trim()) { setError('회의 내용을 입력해주세요.'); return; }
    setError('');
    setStep('summarizing');
    try {
      const taskId = await startTask(transcript, 'processing', '회의록 정리 중...');
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feature: 'transcribe',
          system: `당신은 마을 회의록 정리 전문가입니다. 회의 내용을 공식 회의록으로 정리합니다.

다음 형식으로 작성하세요:

━━━━━━━━━━━━━━━━━━━━
         마을 회의록
━━━━━━━━━━━━━━━━━━━━

■ 회의 정보
  - 일시: (내용에서 파악)
  - 장소: (내용에서 파악)
  - 참석자: (내용에서 파악)

■ 회의 안건
  1. (안건 제목)
  2. (안건 제목)

■ 회의 내용
  [안건 1] (제목)
  - 주요 논의:
  - 찬반 의견:
  - 결정 사항:

■ 결정 사항 요약
  1. (결정 내용) — 담당: / 기한:
  2. (결정 내용) — 담당: / 기한:

■ 기타 사항
  - (추가 논의 또는 차기 회의 일정 등)

━━━━━━━━━━━━━━━━━━━━
작성일: (오늘 날짜)
작성자:
━━━━━━━━━━━━━━━━━━━━`,
          messages: [{
            role: 'user',
            content: `다음 회의 내용을 공식 회의록으로 정리해주세요:\n\n${transcript}`,
          }],
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setSummary(data.text);
      setStep('result');
      setDetailOpen(false);
      try {
        await updateAITask(id, taskId, { inputText: transcript, outputText: data.text, outputData: null, status: 'completed', stage: '회의록 정리 완료', errorMessage: '' });
      } catch {}
    } catch (e) {
      const message = e instanceof Error ? e.message : '정리에 실패했습니다.';
      setError(message);
      try { if (taskIdRef.current) await updateAITask(id, taskIdRef.current, { status: 'failed', stage: '회의록 정리 실패', errorMessage: message }); } catch {}
      setStep('transcript');
    }
  };

  const copyText = (text: string, setter: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPDF = async () => {
    if (!documentRef.current) return;
    setExportingPDF(true);
    try {
      const { default: html2pdf } = await import('html2pdf.js');
      const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
      await html2pdf()
        .set({
          filename: `회의록_${date}.pdf`,
          margin: [12, 12, 14, 12],
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        })
        .from(documentRef.current)
        .save();
    } catch (e) {
      setError(e instanceof Error ? `PDF 다운로드에 실패했습니다: ${e.message}` : 'PDF 다운로드에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setExportingPDF(false);
    }
  };

  const stepIndex = ['upload', 'transcribing', 'transcript', 'summarizing', 'result'].indexOf(step);
  const progressSteps = [0, 1, 1, 2, 2];
  const currentProgress = progressSteps[stepIndex] ?? 0;
  const dashboard = summary ? extractMeetingDashboard(summary) : null;

  return (
    <DashboardShell villageId={id}>
      <div className="max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-lg bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center">
            <Mic className="w-5 h-5 text-orange-500" />
          </div>
          <h1 className="text-xl font-bold">회의록 자동 정리</h1>
        </div>

        <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-6 mb-4">
          {/* Progress bar */}
          <div className="flex gap-2 mb-5">
            {['음성 업로드', '텍스트 추출', '회의록 정리'].map((label, i) => (
              <div key={label} className="flex-1">
                <div className={`h-1.5 rounded-full mb-1 ${i <= currentProgress ? 'bg-primary' : 'bg-[var(--color-border)]'}`} />
                <p className={`text-[10px] text-center ${i <= currentProgress ? 'text-primary font-bold' : 'text-[var(--color-text-secondary)]'}`}>{label}</p>
              </div>
            ))}
          </div>

          {/* Step 1: Upload */}
          {step === 'upload' && (
            <>
              <p className="text-sm text-[var(--color-text-secondary)] mb-4">녹음 파일을 업로드하면 AI가 음성을 텍스트로 변환하고, 회의록으로 정리합니다.</p>
              <input ref={fileRef} type="file" accept="audio/*,.m4a,.mp3,.wav,.webm,.ogg,.flac" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />

              <div className="grid sm:grid-cols-2 gap-3 mb-4">
                <button onClick={() => fileRef.current?.click()} className="p-6 rounded-xl border-2 border-dashed border-[var(--color-border)] flex flex-col items-center gap-2 hover:border-primary transition-colors">
                  <Upload className="w-8 h-8 text-[var(--color-text-secondary)]" />
                  <span className="text-sm font-medium">녹음 파일 업로드</span>
                  <span className="text-xs text-[var(--color-text-secondary)]">MP3, M4A, WAV, FLAC (25MB 이하)</span>
                </button>
                <button onClick={directInput} className="p-6 rounded-xl border-2 border-dashed border-[var(--color-border)] flex flex-col items-center gap-2 hover:border-primary transition-colors">
                  <Mic className="w-8 h-8 text-[var(--color-text-secondary)]" />
                  <span className="text-sm font-medium">직접 입력</span>
                  <span className="text-xs text-[var(--color-text-secondary)]">회의 내용 붙여넣기</span>
                </button>
              </div>

              {file && (
                <div className="p-3 rounded-lg bg-[var(--color-surface)] space-y-3">
                  <div className="flex items-center gap-3">
                    <button onClick={togglePlay} className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shrink-0 hover:opacity-90">
                      {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-[var(--color-text-secondary)]">{(file.size / 1024 / 1024).toFixed(1)}MB</p>
                    </div>
                    <button onClick={transcribeAudio} className="px-5 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90 shrink-0">
                      음성 인식 시작
                    </button>
                  </div>
                  <audio ref={audioRef} src={audioUrl} onEnded={() => setPlaying(false)} className="w-full h-8" controls />
                </div>
              )}
            </>
          )}

          {/* Step: Transcribing */}
          {step === 'transcribing' && (
            <div className="text-center py-12">
              <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
              <p className="text-lg font-bold mb-1">음성을 텍스트로 변환하는 중...</p>
              <p className="text-sm text-[var(--color-text-secondary)]">파일 크기에 따라 1~2분 정도 소요될 수 있습니다.</p>
            </div>
          )}

          {/* Step 2: Transcript */}
          {step === 'transcript' && (
            <>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold">추출된 원문 (수정 가능)</p>
                {transcript && (
                  <button onClick={() => copyText(transcript, setCopiedRaw)} className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)] hover:text-primary">
                    {copiedRaw ? <><Check className="w-3 h-3" /> 복사됨</> : <><Copy className="w-3 h-3" /> 원문 복사</>}
                  </button>
                )}
              </div>
              <textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} rows={12} placeholder="회의 내용을 붙여넣거나 입력하세요...&#10;&#10;예: 12월 10일 마을회관에서 정기 마을회의가 열렸습니다. 참석자는 이장 김OO, 사무장 박OO 등 15명이며..." className="w-full px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl resize-none focus:outline-none focus:border-primary mb-4" />
              <div className="flex gap-2">
                <button onClick={() => { setStep('upload'); setTranscript(''); }} className="flex-1 py-3 rounded-xl border border-[var(--color-border)] text-sm font-medium">이전</button>
                <button onClick={generateSummary} disabled={!transcript.trim()} className="flex-1 py-3 rounded-xl bg-primary text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50">
                  회의록 정리
                </button>
              </div>
            </>
          )}

          {/* Step: Summarizing */}
          {step === 'summarizing' && (
            <div className="text-center py-12">
              <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
              <p className="text-lg font-bold mb-1">회의록을 정리하는 중...</p>
              <p className="text-sm text-[var(--color-text-secondary)]">AI가 회의 내용을 공식 회의록 양식으로 변환하고 있습니다.</p>
            </div>
          )}

          {/* Step 3: Result */}
          {step === 'result' && summary && dashboard && (
            <div className="space-y-4">
              <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
                  <div>
                    <p className="text-xs font-semibold text-primary mb-1">회의록 자동 정리</p>
                    <h3 className="font-bold text-lg">핵심 요약 대시보드</h3>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-1">결정 사항과 후속 업무를 빠르게 확인하세요.</p>
                  </div>
                  <button onClick={downloadPDF} disabled={exportingPDF} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-primary text-white hover:bg-primary-dark disabled:opacity-60">
                    {exportingPDF ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> PDF 만드는 중...</> : <><Download className="w-3.5 h-3.5" /> PDF 다운로드</>}
                  </button>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <MeetingCard icon={<CalendarDays className="w-4 h-4" />} label="회의 일시" value={dashboard.date} tone="blue" />
                  <MeetingCard icon={<MapPin className="w-4 h-4" />} label="회의 장소" value={dashboard.place} tone="green" />
                  <MeetingCard icon={<Users className="w-4 h-4" />} label="참석자" value={dashboard.attendees} tone="violet" />
                  <MeetingCard icon={<ListChecks className="w-4 h-4" />} label="회의 안건" value={dashboard.agendas.length ? `${dashboard.agendas.length}건` : EMPTY_VALUE} detail={dashboard.agendas[0]} tone="amber" />
                  <MeetingCard icon={<CheckCircle2 className="w-4 h-4" />} label="결정 사항" value={dashboard.decisions.length ? `${dashboard.decisions.length}건` : EMPTY_VALUE} detail={dashboard.decisions[0]} tone="emerald" />
                  <MeetingCard icon={<CircleAlert className="w-4 h-4" />} label="후속 확인" value={dashboard.followUps[0] || EMPTY_VALUE} tone="rose" />
                </div>

                <div className="grid lg:grid-cols-2 gap-4 mt-5">
                  <MeetingList title="회의 안건" items={dashboard.agendas} emptyMessage="안건을 확인할 수 없습니다." />
                  <MeetingList title="결정 사항 · 담당/기한" items={dashboard.decisions} emptyMessage="결정 사항을 확인할 수 없습니다." highlight />
                </div>
              </section>

              <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] overflow-hidden">
                <div className="flex items-center justify-between gap-3 p-5">
                  <button onClick={() => setDetailOpen((open) => !open)} aria-expanded={detailOpen} className="flex flex-1 items-center justify-between text-left">
                    <div>
                      <h3 className="font-bold">전체 회의록 보기</h3>
                      <p className="text-xs text-[var(--color-text-secondary)] mt-1">보관과 인쇄에 적합한 공식 문서 형태입니다.</p>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-[var(--color-text-secondary)] transition-transform ${detailOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => copyText(summary, setCopiedResult)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs border border-[var(--color-border)] hover:border-primary">
                      {copiedResult ? <><Check className="w-3.5 h-3.5" /> 복사됨</> : <><Copy className="w-3.5 h-3.5" /> 복사</>}
                    </button>
                    <button onClick={() => downloadFile(summary, `회의록_${new Date().toISOString().slice(0, 10)}.txt`)} className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs border border-[var(--color-border)] hover:border-primary">
                      <Download className="w-3.5 h-3.5" /> 텍스트
                    </button>
                  </div>
                </div>

                {detailOpen && <div className="border-t border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-6"><ForwardedMeetingDocument summary={summary} dashboard={dashboard} /></div>}
              </section>

              <details className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]">
                <summary className="cursor-pointer p-4 text-sm font-medium">원문 보기 (음성 추출 텍스트)</summary>
                <div className="border-t border-[var(--color-border)] p-4">
                  <div className="flex justify-end gap-2 mb-2">
                    <button onClick={() => copyText(transcript, setCopiedRaw)} className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)] hover:text-primary">{copiedRaw ? <><Check className="w-3 h-3" /> 복사됨</> : <><Copy className="w-3 h-3" /> 원문 복사</>}</button>
                    <button onClick={() => downloadFile(transcript, `원문_${new Date().toISOString().slice(0, 10)}.txt`)} className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)] hover:text-primary"><Download className="w-3 h-3" /> 다운로드</button>
                  </div>
                  <div className="rounded-lg bg-[var(--color-surface)] p-4 text-sm whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">{transcript}</div>
                </div>
              </details>

              <div className="absolute -left-[9999px] top-0 w-[794px]" aria-hidden="true"><ForwardedMeetingPdfDocument ref={documentRef} summary={summary} dashboard={dashboard} /></div>

              <button onClick={() => { taskIdRef.current = ''; setStep('transcript'); }} className="w-full py-2 rounded-xl border border-[var(--color-border)] text-sm">원문 수정 후 다시 정리하기</button>
            </div>
          )}
        </div>

        {error && <div className="p-4 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm">{error}</div>}
      </div>
    </DashboardShell>
  );
}

function MeetingCard({ icon, label, value, detail, tone }: { icon: React.ReactNode; label: string; value: string; detail?: string; tone: 'blue' | 'green' | 'violet' | 'amber' | 'emerald' | 'rose' }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-500/10 dark:border-blue-500/20',
    green: 'bg-green-50 text-green-600 border-green-100 dark:bg-green-500/10 dark:border-green-500/20',
    violet: 'bg-violet-50 text-violet-600 border-violet-100 dark:bg-violet-500/10 dark:border-violet-500/20',
    amber: 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-500/10 dark:border-amber-500/20',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20',
    rose: 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-500/10 dark:border-rose-500/20',
  };
  return <div className={`rounded-xl border p-4 ${tones[tone]}`}><div className="flex items-center gap-2 text-xs font-semibold mb-2">{icon}<span>{label}</span></div><p className="text-sm leading-6 text-[var(--color-text)]">{value}</p>{detail && <p className="mt-1 text-xs leading-5 text-[var(--color-text-secondary)] line-clamp-2">{detail}</p>}</div>;
}

function MeetingList({ title, items, emptyMessage, highlight = false }: { title: string; items: string[]; emptyMessage: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${highlight ? 'border-primary/20 bg-primary-light/40 dark:bg-primary/5' : 'border-[var(--color-border)] bg-[var(--color-surface)]'}`}>
      <h4 className="text-sm font-bold mb-3">{title}</h4>
      {items.length ? <ol className="space-y-2 text-sm leading-6">{items.map((item, index) => <li key={`${item}-${index}`} className="flex gap-2"><span className="font-bold text-primary">{index + 1}.</span><span>{item}</span></li>)}</ol> : <p className="text-sm text-[var(--color-text-secondary)]">{emptyMessage}</p>}
    </div>
  );
}

const MeetingDocument = ({ summary, dashboard }: { summary: string; dashboard: MeetingDashboard }, ref: React.ForwardedRef<HTMLDivElement>) => (
  <div ref={ref} className="bg-white text-slate-800 max-w-3xl mx-auto rounded-lg shadow-sm p-6 sm:p-10" style={{ fontFamily: 'Arial, "Malgun Gothic", sans-serif' }}>
    <header className="border-b-2 border-emerald-700 pb-5 mb-7">
      <p className="text-xs font-bold text-emerald-700 tracking-wide mb-2">VILLAGE AI SECRETARY</p>
      <h2 className="text-2xl font-bold text-slate-900">마을 회의록</h2>
      <p className="text-sm text-slate-500 mt-2">{dashboard.date} · {dashboard.place} · 참석자 {dashboard.attendees}</p>
    </header>
    <div className="space-y-2 text-sm leading-7 text-slate-700">
      {summary.split(/\r?\n/).map((line, index) => {
        if (/^[━\s]+$/.test(line) || line.trim() === '마을 회의록') return null;
        const heading = line.match(/^\s*■\s*(.+)$/);
        if (heading) return <h3 key={index} className="pdf-section mt-7 mb-3 text-base font-bold text-slate-900 border-l-4 border-emerald-600 pl-3">{cleanMeetingText(heading[1])}</h3>;
        const content = cleanMeetingText(line);
        if (!content) return <div key={index} className="h-1" />;
        const isList = /^\s*(?:[-*•]|\d+[.)])\s+/.test(line);
        return isList ? <div key={index} className="flex gap-2"><span className="mt-[11px] w-1 h-1 rounded-full bg-emerald-600 shrink-0" /><span>{content}</span></div> : <p key={index}>{content}</p>;
      })}
    </div>
    <footer className="pt-4 mt-7 border-t border-slate-200 text-xs text-slate-400">본 문서는 AI가 회의 내용을 정리한 참고용 자료입니다. 필요한 사항은 원문과 함께 확인하세요.</footer>
  </div>
);

const ForwardedMeetingDocument = React.forwardRef(MeetingDocument);

const MeetingPdfDocument = ({ summary, dashboard }: { summary: string; dashboard: MeetingDashboard }, ref: React.ForwardedRef<HTMLDivElement>) => (
  <div ref={ref} className="bg-white p-8" style={{ fontFamily: 'Arial, "Malgun Gothic", sans-serif' }}>
    <section className="mb-6 border border-emerald-100 rounded-xl p-5 text-slate-800">
      <p className="text-xs font-bold text-emerald-700 mb-1">회의록 자동 정리</p>
      <h2 className="text-xl font-bold mb-4">핵심 요약 대시보드</h2>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <MeetingPdfFact label="회의 일시" value={dashboard.date} />
        <MeetingPdfFact label="회의 장소" value={dashboard.place} />
        <MeetingPdfFact label="참석자" value={dashboard.attendees} />
        <MeetingPdfFact label="회의 안건" value={dashboard.agendas.length ? `${dashboard.agendas.length}건 - ${dashboard.agendas[0]}` : EMPTY_VALUE} />
        <MeetingPdfFact label="결정 사항" value={dashboard.decisions.length ? `${dashboard.decisions.length}건 - ${dashboard.decisions[0]}` : EMPTY_VALUE} />
        <MeetingPdfFact label="후속 확인" value={dashboard.followUps[0] || EMPTY_VALUE} />
      </div>
    </section>
    <MeetingDocument summary={summary} dashboard={dashboard} />
  </div>
);

function MeetingPdfFact({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-emerald-50 p-3"><p className="text-xs font-bold text-emerald-700 mb-1">{label}</p><p className="leading-5 text-slate-800">{value}</p></div>;
}

const ForwardedMeetingPdfDocument = React.forwardRef(MeetingPdfDocument);
