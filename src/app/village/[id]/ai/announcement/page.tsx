'use client';

import { useState, useRef } from 'react';
import { FileSearch, ImagePlus, Loader2, Copy, Check } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';

export default function AnnouncementPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleFile = (f: File) => {
    setFile(f);
    setResult('');
    setError('');
    if (f.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(f);
    } else {
      setPreview('');
    }
  };

  const analyze = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const base64 = await new Promise<string>((res) => {
        const reader = new FileReader();
        reader.onload = () => res((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
      });
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feature: 'announcement',
          system: `당신은 한국 농촌 마을 이장·사무장을 돕는 AI 비서입니다. 공고문/공문서를 분석해 핵심 내용을 추출합니다.

다음 형식으로 정리해주세요:
## 📋 문서 요약
- 문서 종류:
- 발신 기관:
- 날짜:

## 🎯 핵심 내용
(가장 중요한 내용 3-5줄)

## 📌 주요 사항
- 신청 기간:
- 대상:
- 지원 내용/금액:
- 제출 서류:
- 문의처:

## ⚠️ 유의사항

## 💡 이장님 참고사항`,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: file.type || 'image/jpeg', data: base64 } },
              { type: 'text', text: '이 공고문/공문서의 핵심 내용을 분석해주세요.' },
            ],
          }],
        }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setResult(data.text);
    } catch (e) {
      setError(e instanceof Error ? e.message : '분석에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const copyResult = () => { navigator.clipboard.writeText(result); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <DashboardShell villageId={id}>
      <div className="max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
            <FileSearch className="w-5 h-5 text-blue-500" />
          </div>
          <h1 className="text-xl font-bold">공고문 분석</h1>
        </div>

        <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-6 mb-4">
          <p className="text-sm text-[var(--color-text-secondary)] mb-4">공고문 또는 공문서 이미지를 업로드하면 AI가 핵심 내용을 추출·요약합니다.</p>
          <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          {!file ? (
            <button onClick={() => fileRef.current?.click()} className="w-full h-48 rounded-xl border-2 border-dashed border-[var(--color-border)] flex flex-col items-center justify-center gap-2 hover:border-primary transition-colors">
              <ImagePlus className="w-10 h-10 text-[var(--color-text-secondary)]" />
              <span className="text-sm text-[var(--color-text-secondary)]">클릭하여 이미지 업로드</span>
              <span className="text-xs text-[var(--color-text-secondary)]">JPG, PNG, PDF</span>
            </button>
          ) : (
            <div className="space-y-4">
              {preview && <img src={preview} alt="미리보기" className="max-h-64 rounded-xl mx-auto" />}
              <div className="flex items-center justify-between">
                <span className="text-sm truncate flex-1">{file.name}</span>
                <button onClick={() => { setFile(null); setPreview(''); setResult(''); }} className="text-xs text-error ml-2">제거</button>
              </div>
              <button onClick={analyze} disabled={loading} className="w-full py-3 rounded-xl bg-primary text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> 분석 중...</> : '분석하기'}
              </button>
            </div>
          )}
        </div>

        {error && <div className="p-4 rounded-xl bg-red-50 text-error text-sm mb-4">{error}</div>}

        {result && (
          <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">분석 결과</h3>
              <button onClick={copyResult} className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)] hover:text-primary">
                {copied ? <><Check className="w-3.5 h-3.5" /> 복사됨</> : <><Copy className="w-3.5 h-3.5" /> 복사</>}
              </button>
            </div>
            <div className="prose prose-sm max-w-none text-[var(--color-text)] whitespace-pre-wrap">{result}</div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
