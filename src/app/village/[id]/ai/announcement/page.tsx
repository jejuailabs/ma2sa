'use client';

import { useState, useRef } from 'react';
import { FileSearch, Upload, Loader2, Copy, Check, FileText, AlertCircle } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { saveAITask } from '@/lib/firebase/firestore';
import { useAuth } from '@/hooks/useAuth';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const PDF_TYPE = 'application/pdf';
const EXTRACTABLE_EXTS = ['.docx', '.pptx', '.xlsx', '.hwpx', '.hwp', '.odt', '.odp', '.txt', '.md', '.csv', '.rtf'];

function getFileExt(name: string) {
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot).toLowerCase() : '';
}

export default function AnnouncementPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [textInput, setTextInput] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleFile = async (f: File) => {
    setResult('');
    setError('');

    const ext = getFileExt(f.name);
    const isImage = IMAGE_TYPES.includes(f.type);
    const isPDF = f.type === PDF_TYPE || ext === '.pdf';

    if (isImage) {
      setFile(f);
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(f);
      return;
    }

    if (isPDF) {
      setFile(f);
      setPreview('');
      return;
    }

    if (EXTRACTABLE_EXTS.includes(ext)) {
      setFile(null);
      setPreview('');
      setExtracting(true);
      try {
        const formData = new FormData();
        formData.append('file', f);
        const res = await fetch('/api/ai/extract-text', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        if (data.unsupported) {
          setError(data.unsupported);
          return;
        }
        if (data.text) {
          setTextInput((prev) => prev ? `${prev}\n\n${data.text}` : data.text);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : '파일 텍스트 추출에 실패했습니다.');
      } finally {
        setExtracting(false);
      }
      return;
    }

    setFile(null);
    setPreview('');
    setError(`지원하지 않는 파일 형식입니다. (${ext || f.type})`);
  };

  const analyze = async () => {
    if (!file && !textInput.trim()) { setError('분석할 내용을 입력하거나 파일을 첨부해주세요.'); return; }
    setLoading(true);
    setError('');
    try {
      const contentParts: Array<{ type: string; text?: string; source?: { type: string; media_type: string; data: string } }> = [];

      if (file) {
        const isImage = IMAGE_TYPES.includes(file.type);
        const isPDF = file.type === PDF_TYPE || getFileExt(file.name) === '.pdf';

        if (isImage || isPDF) {
          const base64 = await fileToBase64(file);
          if (isImage) {
            contentParts.push({ type: 'image', source: { type: 'base64', media_type: file.type, data: base64 } });
          } else {
            contentParts.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } });
          }
        }
      }

      if (textInput.trim()) {
        contentParts.push({ type: 'text', text: `다음 공고문/공문서 내용을 분석해주세요:\n\n${textInput}` });
      } else {
        contentParts.push({ type: 'text', text: '이 공고문/공문서의 핵심 내용을 분석해주세요.' });
      }

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
          messages: [{ role: 'user', content: contentParts }],
        }),
      });
      if (!response.ok) {
        let detail = `서버 오류 (${response.status})`;
        try { const e = await response.json(); if (e.error) detail = e.error; } catch {}
        throw new Error(detail);
      }
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      if (!data.text?.trim()) throw new Error('AI 응답이 비어있습니다. 다시 시도해주세요.');
      setResult(data.text);
      try {
        await saveAITask(id, { type: 'announcement', title: `공고문 분석 - ${file?.name || '텍스트 입력'}`, inputText: textInput, inputImages: preview ? [preview] : [], outputText: data.text, outputData: null, createdBy: user?.uid || '' });
      } catch {}
    } catch (e) {
      setError(e instanceof Error ? e.message : '분석에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const copyResult = () => { navigator.clipboard.writeText(result); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const canAnalyze = file || textInput.trim();

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
          <p className="text-sm text-[var(--color-text-secondary)] mb-4">
            공고문·공문서를 분석합니다. 텍스트를 직접 붙여넣거나, 파일을 첨부하세요.
          </p>

          {/* 지원 형식 안내 */}
          <div className="grid sm:grid-cols-2 gap-3 mb-5">
            <div className="px-4 py-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30">
              <p className="text-xs font-bold text-blue-700 dark:text-blue-300 mb-1">파일 첨부로 바로 분석</p>
              <p className="text-xs text-blue-600 dark:text-blue-400">이미지 (JPG, PNG) · PDF</p>
            </div>
            <div className="px-4 py-3 rounded-xl bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30">
              <p className="text-xs font-bold text-green-700 dark:text-green-300 mb-1">첨부하면 텍스트 자동 추출</p>
              <p className="text-xs text-green-600 dark:text-green-400">워드 (DOCX) · 한글 (HWPX) · PPT (PPTX)</p>
            </div>
          </div>

          {/* 텍스트 입력 */}
          <label className="block mb-1">
            <span className="text-sm font-bold">텍스트 입력</span>
          </label>
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            rows={6}
            placeholder="공고문 내용을 여기에 붙여넣기 하세요...&#10;&#10;또는 아래에서 파일을 첨부하면 자동으로 텍스트가 추출됩니다."
            className="w-full px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl resize-none focus:outline-none focus:border-primary mb-3"
          />

          {/* 파일 첨부 */}
          <input ref={fileRef} type="file" accept="image/*,.pdf,.docx,.hwpx,.hwp,.pptx,.xlsx,.odt,.odp,.txt,.md,.csv,.rtf" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); e.target.value = ''; }} />

          {extracting && (
            <div className="flex items-center gap-2 px-4 py-3 mb-3 rounded-xl bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 text-sm text-green-700 dark:text-green-300">
              <Loader2 className="w-4 h-4 animate-spin" /> 파일에서 텍스트를 추출하는 중...
            </div>
          )}

          {file ? (
            <div className="mb-4 space-y-3">
              {preview && <img src={preview} alt="미리보기" className="max-h-48 rounded-xl border border-[var(--color-border)]" />}
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
                <FileText className="w-4 h-4 text-blue-500" />
                <span className="text-sm flex-1 truncate">{file.name}</span>
                <span className="text-xs text-[var(--color-text-secondary)]">{(file.size / 1024).toFixed(0)}KB</span>
                <button onClick={() => { setFile(null); setPreview(''); }} className="text-xs text-error">제거</button>
              </div>
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()} disabled={extracting} className="flex items-center gap-2 px-4 py-2.5 mb-4 rounded-lg border border-dashed border-[var(--color-border)] text-sm hover:border-primary disabled:opacity-50 w-full justify-center">
              <Upload className="w-4 h-4" /> 파일 첨부 (이미지 · PDF · 워드 · 한글 · PPT)
            </button>
          )}

          {error && (
            <div className="flex items-start gap-2 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm mb-3">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button onClick={analyze} disabled={loading || extracting || !canAnalyze} className="w-full py-3 rounded-xl bg-primary text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> 분석 중...</> : '분석하기'}
          </button>
        </div>

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

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
}
