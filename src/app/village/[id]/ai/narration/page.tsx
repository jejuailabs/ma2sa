'use client';

import { useState, useRef } from 'react';
import { Volume2, Loader2, Play, Pause, Download, RefreshCw } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';

const VOICES = [
  { value: 'alloy', label: '중성 (또렷한 목소리)' },
  { value: 'echo', label: '남성 (낮은 목소리)' },
  { value: 'fable', label: '남성 (부드러운 목소리)' },
  { value: 'onyx', label: '남성 (깊은 목소리)' },
  { value: 'nova', label: '여성 (밝은 목소리)' },
  { value: 'shimmer', label: '여성 (차분한 목소리)' },
];

const PRESETS = [
  { label: '마을 공지', text: '마을 주민 여러분 안녕하십니까. 이장 OOO입니다.\n\n' },
  { label: '행사 안내', text: '마을 주민 여러분께 안내드립니다.\n오는 O월 O일 O요일, 마을회관에서\n' },
  { label: '긴급 공지', text: '마을 주민 여러분 긴급 안내입니다.\n' },
];

export default function NarrationPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const audioRef = useRef<HTMLAudioElement>(null);
  const [text, setText] = useState('');
  const [voice, setVoice] = useState('nova');
  const [speed, setSpeed] = useState(0.9);
  const [audioUrl, setAudioUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [polishing, setPolishing] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState('');

  const polishText = async () => {
    if (!text.trim()) return;
    setPolishing(true);
    setError('');
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feature: 'narration',
          system: `당신은 마을 방송 원고 전문가입니다. 사용자가 입력한 내용을 마을 스피커 방송에 적합한 자연스러운 원고로 다듬어주세요.

규칙:
1. 공손하고 따뜻한 어투 사용 (경어체)
2. 문장을 짧고 명확하게 구성
3. 중요한 내용은 반복하여 강조
4. 날짜·시간·장소는 명확하게
5. 마지막에 "감사합니다" 또는 적절한 마무리 인사 추가
6. 원고 텍스트만 출력 (설명 없이)`,
          messages: [{ role: 'user', content: `다음 내용을 마을 방송 원고로 다듬어주세요:\n\n${text}` }],
          maxTokens: 1024,
        }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setText(data.text);
    } catch (e) {
      setError(e instanceof Error ? e.message : '원고 정리에 실패했습니다.');
    } finally {
      setPolishing(false);
    }
  };

  const generate = async () => {
    if (!text.trim()) { setError('방송할 내용을 입력해주세요.'); return; }
    setLoading(true);
    setError('');
    setAudioUrl('');
    try {
      const response = await fetch('/api/ai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice, speed }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      const audioBytes = atob(data.audioContent);
      const arr = new Uint8Array(audioBytes.length);
      for (let i = 0; i < audioBytes.length; i++) arr[i] = audioBytes.charCodeAt(i);
      const blob = new Blob([arr], { type: 'audio/mp3' });
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : '음성 생성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); }
    else { audioRef.current.play(); }
    setPlaying(!playing);
  };

  const downloadAudio = () => {
    if (!audioUrl) return;
    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = `방송_${new Date().toISOString().slice(0, 10)}.mp3`;
    a.click();
  };

  return (
    <DashboardShell villageId={id}>
      <div className="max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-lg bg-pink-50 dark:bg-pink-500/10 flex items-center justify-center">
            <Volume2 className="w-5 h-5 text-pink-500" />
          </div>
          <h1 className="text-xl font-bold">대신 읽어주기</h1>
        </div>

        <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-6 mb-4">
          <p className="text-sm text-[var(--color-text-secondary)] mb-4">마을 방송용 텍스트를 입력하면 AI가 자연스러운 음성으로 변환합니다.</p>

          <div className="flex gap-2 mb-3">
            {PRESETS.map((p) => (
              <button key={p.label} onClick={() => setText(p.text)} className="px-3 py-1.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-xs hover:border-primary">
                {p.label}
              </button>
            ))}
          </div>

          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} placeholder="방송할 내용을 입력하세요...&#10;&#10;예: 마을 주민 여러분 안녕하십니까. 내일 오전 10시에 마을회관 앞에서 환경 정화 활동이 있습니다. 많은 참여 부탁드립니다." className="w-full px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl resize-none focus:outline-none focus:border-primary mb-3" />

          <div className="flex gap-2 mb-4">
            <button onClick={polishText} disabled={polishing || !text.trim()} className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[var(--color-border)] text-sm hover:border-primary disabled:opacity-50">
              {polishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} AI 원고 다듬기
            </button>
            <span className="text-xs text-[var(--color-text-secondary)] self-center">{text.length}/5000자</span>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <label className="block">
              <span className="text-sm font-medium mb-1 block">목소리</span>
              <select value={voice} onChange={(e) => setVoice(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-sm">
                {VOICES.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium mb-1 block">속도: {speed.toFixed(1)}x</span>
              <input type="range" min={0.5} max={1.5} step={0.1} value={speed} onChange={(e) => setSpeed(parseFloat(e.target.value))} className="w-full accent-primary" />
              <div className="flex justify-between text-xs text-[var(--color-text-secondary)]">
                <span>느리게</span><span>보통</span><span>빠르게</span>
              </div>
            </label>
          </div>

          <button onClick={generate} disabled={loading || !text.trim()} className="w-full py-3 rounded-xl bg-primary text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> 음성 생성 중...</> : '음성 생성하기'}
          </button>
        </div>

        {error && <div className="p-4 rounded-xl bg-red-50 text-error text-sm mb-4">{error}</div>}

        {audioUrl && (
          <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-6">
            <h3 className="font-bold mb-4">생성된 음성</h3>
            <audio ref={audioRef} src={audioUrl} onEnded={() => setPlaying(false)} />
            <div className="flex items-center gap-3">
              <button onClick={togglePlay} className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center hover:opacity-90">
                {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </button>
              <div className="flex-1">
                <p className="text-sm font-medium">마을 방송 음성</p>
                <p className="text-xs text-[var(--color-text-secondary)]">{VOICES.find((v) => v.value === voice)?.label} · {speed}x</p>
              </div>
              <button onClick={downloadAudio} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-sm hover:opacity-90">
                <Download className="w-4 h-4" /> MP3 저장
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
