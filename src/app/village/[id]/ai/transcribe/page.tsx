'use client';

import { useState, useRef } from 'react';
import { Mic, Loader2, Copy, Check, Download, Upload, Play, Pause } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { saveAITask } from '@/lib/firebase/firestore';
import { useAuth } from '@/hooks/useAuth';

export default function TranscribePage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [playing, setPlaying] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [summary, setSummary] = useState('');
  const [step, setStep] = useState<'upload' | 'transcript' | 'result'>('upload');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleFile = (f: File) => {
    setFile(f);
    setError('');
    setTranscript('');
    setSummary('');
    setStep('upload');
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(URL.createObjectURL(f));
    setPlaying(false);
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); } else { audioRef.current.play(); }
    setPlaying(!playing);
  };

  const transcribeAudio = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      setStep('transcript');
      setTranscript('(음성 인식은 Google Speech-to-Text API 연동 후 자동 변환됩니다)\n\n아래에 회의 내용을 직접 붙여넣거나 수정할 수 있습니다.');
    } finally {
      setLoading(false);
    }
  };

  const generateSummary = async () => {
    if (!transcript.trim()) { setError('회의 내용을 입력해주세요.'); return; }
    setLoading(true);
    setError('');
    try {
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
      try {
        await saveAITask(id, {
          type: 'transcribe',
          title: `회의록 정리${file ? ` (${file.name})` : ''}`,
          inputText: transcript,
          inputImages: [],
          outputText: data.text,
          outputData: null,
          createdBy: user?.uid || '',
        });
      } catch {}
    } catch (e) {
      setError(e instanceof Error ? e.message : '정리에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const copyResult = () => {
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadTxt = () => {
    const blob = new Blob([summary], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `회의록_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
          <div className="flex gap-2 mb-4">
            {['upload', 'transcript', 'result'].map((s, i) => (
              <div key={s} className={`flex-1 h-1.5 rounded-full ${i <= ['upload', 'transcript', 'result'].indexOf(step) ? 'bg-primary' : 'bg-[var(--color-border)]'}`} />
            ))}
          </div>

          {step === 'upload' && (
            <>
              <p className="text-sm text-[var(--color-text-secondary)] mb-4">녹음 파일을 업로드하거나, 회의 내용을 직접 입력할 수 있습니다.</p>
              <input ref={fileRef} type="file" accept="audio/*,.m4a,.mp3,.wav,.webm" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />

              <div className="grid sm:grid-cols-2 gap-3 mb-4">
                <button onClick={() => fileRef.current?.click()} className="p-6 rounded-xl border-2 border-dashed border-[var(--color-border)] flex flex-col items-center gap-2 hover:border-primary transition-colors">
                  <Upload className="w-8 h-8 text-[var(--color-text-secondary)]" />
                  <span className="text-sm font-medium">녹음 파일 업로드</span>
                  <span className="text-xs text-[var(--color-text-secondary)]">MP3, M4A, WAV</span>
                </button>
                <button onClick={() => { setTranscript(''); setStep('transcript'); }} className="p-6 rounded-xl border-2 border-dashed border-[var(--color-border)] flex flex-col items-center gap-2 hover:border-primary transition-colors">
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
                    <button onClick={transcribeAudio} disabled={loading} className="px-4 py-1.5 rounded-lg bg-primary text-white text-sm disabled:opacity-50 shrink-0">
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : '다음'}
                    </button>
                  </div>
                  <audio ref={audioRef} src={audioUrl} onEnded={() => setPlaying(false)} className="w-full h-8" controls />
                </div>
              )}
            </>
          )}

          {step === 'transcript' && (
            <>
              <p className="text-sm text-[var(--color-text-secondary)] mb-3">회의 내용을 입력하거나 수정한 후 "회의록 정리" 버튼을 누르세요.</p>
              <textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} rows={12} placeholder="회의 내용을 붙여넣거나 입력하세요...&#10;&#10;예: 12월 10일 마을회관에서 정기 마을회의가 열렸습니다. 참석자는 이장 김OO, 사무장 박OO 등 15명이며..." className="w-full px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl resize-none focus:outline-none focus:border-primary mb-4" />
              <div className="flex gap-2">
                <button onClick={() => setStep('upload')} className="flex-1 py-3 rounded-xl border border-[var(--color-border)] text-sm">이전</button>
                <button onClick={generateSummary} disabled={loading || !transcript.trim()} className="flex-1 py-3 rounded-xl bg-primary text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> 정리 중...</> : '회의록 정리'}
                </button>
              </div>
            </>
          )}

          {step === 'result' && summary && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold">회의록</h3>
                <div className="flex gap-2">
                  <button onClick={copyResult} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs border border-[var(--color-border)] hover:border-primary">
                    {copied ? <><Check className="w-3.5 h-3.5" /> 복사됨</> : <><Copy className="w-3.5 h-3.5" /> 복사</>}
                  </button>
                  <button onClick={downloadTxt} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-primary text-white hover:opacity-90">
                    <Download className="w-3.5 h-3.5" /> 다운로드
                  </button>
                </div>
              </div>
              <div className="bg-[var(--color-surface)] rounded-xl p-5 font-mono text-sm whitespace-pre-wrap leading-relaxed">{summary}</div>
              <button onClick={() => setStep('transcript')} className="mt-4 w-full py-2 rounded-xl border border-[var(--color-border)] text-sm">다시 정리하기</button>
            </>
          )}
        </div>

        {error && <div className="p-4 rounded-xl bg-red-50 text-error text-sm">{error}</div>}
      </div>
    </DashboardShell>
  );
}
