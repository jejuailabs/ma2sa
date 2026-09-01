'use client';

import React, { useState, useRef } from 'react';
import { FileSearch, Upload, Loader2, Copy, Check, FileText, AlertCircle, CalendarDays, Users, HandCoins, ClipboardList, Phone, TriangleAlert, ChevronDown, Download } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { saveAITask, updateAITask } from '@/lib/firebase/firestore';
import { uploadFile } from '@/lib/firebase/storage';
import { useAuth } from '@/hooks/useAuth';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const PDF_TYPE = 'application/pdf';
const EXTRACTABLE_EXTS = ['.docx', '.pptx', '.xlsx', '.hwpx', '.hwp', '.odt', '.odp', '.txt', '.md', '.csv', '.rtf'];

type AnnouncementSummary = {
  documentType: string;
  organization: string;
  date: string;
  applicationPeriod: string;
  target: string;
  support: string;
  documents: string;
  contact: string;
  cautions: string[];
};

const EMPTY_VALUE = '확인 필요';

function stripMarkdown(value: string) {
  return value
    .replace(/^#{1,6}\s*/, '')
    .replace(/^[-*]\s*/, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .trim();
}

function splitSections(text: string) {
  const sections: Array<{ title: string; lines: string[] }> = [];
  let current = { title: '분석 내용', lines: [] as string[] };

  text.split(/\r?\n/).forEach((line) => {
    const heading = line.match(/^#{1,6}\s+(.+)$/);
    if (heading) {
      if (current.lines.length || current.title !== '분석 내용') sections.push(current);
      current = { title: stripMarkdown(heading[1]), lines: [] };
    } else {
      current.lines.push(line);
    }
  });
  if (current.lines.length || current.title !== '분석 내용') sections.push(current);
  return sections;
}

function findSection(sections: ReturnType<typeof splitSections>, keyword: string) {
  return sections.find((section) => section.title.replace(/\s/g, '').includes(keyword.replace(/\s/g, '')))?.lines ?? [];
}

function readField(lines: string[], labels: string[]) {
  const fieldPattern = new RegExp(`^\\s*[-*]?\\s*(?:${labels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\s*[:：]\\s*(.*)$`);
  const allLabels = ['문서 종류', '발신 기관', '날짜', '신청 기간', '대상', '지원 내용/금액', '지원 내용', '금액', '제출 서류', '문의처'];
  const nextFieldPattern = new RegExp(`^\\s*[-*]?\\s*(?:${allLabels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\s*[:：]`);

  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(fieldPattern);
    if (!match) continue;

    const values = [stripMarkdown(match[1])].filter(Boolean);
    for (let next = index + 1; next < lines.length; next += 1) {
      if (nextFieldPattern.test(lines[next])) break;
      const value = stripMarkdown(lines[next]);
      if (value) values.push(value);
    }
    return values.length ? values.join(' · ') : EMPTY_VALUE;
  }
  return EMPTY_VALUE;
}

function extractAnnouncementSummary(text: string): AnnouncementSummary {
  const sections = splitSections(text);
  const documentLines = findSection(sections, '문서요약');
  const mainLines = findSection(sections, '주요사항');
  const cautionLines = findSection(sections, '유의사항');

  return {
    documentType: readField(documentLines, ['문서 종류']),
    organization: readField(documentLines, ['발신 기관']),
    date: readField(documentLines, ['날짜']),
    applicationPeriod: readField(mainLines, ['신청 기간']),
    target: readField(mainLines, ['대상']),
    support: readField(mainLines, ['지원 내용/금액', '지원 내용', '금액']),
    documents: readField(mainLines, ['제출 서류']),
    contact: readField(mainLines, ['문의처']),
    cautions: cautionLines.map(stripMarkdown).filter(Boolean),
  };
}

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
  const [detailOpen, setDetailOpen] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const documentRef = useRef<HTMLDivElement>(null);

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
    let taskId = '';
    try {
      try {
        taskId = await saveAITask(id, {
          type: 'announcement', title: `공고문 분석 - ${file?.name || '텍스트 입력'}`, inputText: textInput,
          inputImages: [], outputText: '', outputData: null, createdBy: user?.uid || '',
          status: 'processing', stage: '공고문 분석 중...', errorMessage: '',
        });
        if (file && IMAGE_TYPES.includes(file.type)) {
          void uploadFile(`villages/${id}/aiTasks/${taskId}/input-${file.name}`, file)
            .then((url) => updateAITask(id, taskId, { inputImages: [url] }))
            .catch(() => {});
        }
      } catch {}
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
      setDetailOpen(false);
      try {
        if (taskId) await updateAITask(id, taskId, { outputText: data.text, outputData: null, status: 'completed', stage: '분석 완료', errorMessage: '' });
      } catch {}
    } catch (e) {
      const message = e instanceof Error ? e.message : '분석에 실패했습니다.';
      setError(message);
      try { if (taskId) await updateAITask(id, taskId, { status: 'failed', stage: '분석 실패', errorMessage: message }); } catch {}
    } finally {
      setLoading(false);
    }
  };

  const copyResult = () => { navigator.clipboard.writeText(result); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const downloadPDF = async () => {
    if (!documentRef.current) return;
    setExportingPDF(true);
    try {
      const { default: html2pdf } = await import('html2pdf.js');
      const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
      await html2pdf()
        .set({
          filename: `공고문_분석_${date}.pdf`,
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

  const canAnalyze = file || textInput.trim();
  const summary = result ? extractAnnouncementSummary(result) : null;
  const sections = result ? splitSections(result) : [];

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

        {result && summary && (
          <div className="space-y-4">
            <section className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-6">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
                <div>
                  <p className="text-xs font-semibold text-primary mb-1">공모사업 분석</p>
                  <h3 className="font-bold text-lg">핵심 요약 대시보드</h3>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">{summary.documentType} · {summary.organization}</p>
                </div>
                <button onClick={downloadPDF} disabled={exportingPDF} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-primary text-white hover:bg-primary-dark disabled:opacity-60">
                  {exportingPDF ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> PDF 만드는 중...</> : <><Download className="w-3.5 h-3.5" /> PDF 다운로드</>}
                </button>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <SummaryCard icon={<CalendarDays className="w-4 h-4" />} label="신청 기간" value={summary.applicationPeriod} tone="blue" />
                <SummaryCard icon={<Users className="w-4 h-4" />} label="지원 대상" value={summary.target} tone="green" />
                <SummaryCard icon={<HandCoins className="w-4 h-4" />} label="지원 내용 / 금액" value={summary.support} tone="amber" />
                <SummaryCard icon={<ClipboardList className="w-4 h-4" />} label="제출 서류" value={summary.documents} tone="violet" />
                <SummaryCard icon={<Phone className="w-4 h-4" />} label="문의처" value={summary.contact} tone="cyan" />
                <SummaryCard icon={<TriangleAlert className="w-4 h-4" />} label="유의사항" value={summary.cautions[0] || EMPTY_VALUE} tone="rose" />
              </div>
            </section>

            <section className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl overflow-hidden">
              <div className="flex items-center justify-between gap-3 p-5">
                <button onClick={() => setDetailOpen((open) => !open)} aria-expanded={detailOpen} className="flex flex-1 items-center justify-between text-left group">
                  <div>
                    <h3 className="font-bold">전체 내용 보기</h3>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-1">분석 결과를 문서 형식으로 정리해 보여드립니다.</p>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-[var(--color-text-secondary)] transition-transform ${detailOpen ? 'rotate-180' : ''}`} />
                </button>
                <button onClick={copyResult} className="shrink-0 flex items-center gap-1 text-xs text-[var(--color-text-secondary)] hover:text-primary">
                  {copied ? <><Check className="w-3.5 h-3.5" /> 복사됨</> : <><Copy className="w-3.5 h-3.5" /> 복사</>}
                </button>
              </div>

              {detailOpen && (
                <div className="border-t border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-6">
                  <ForwardedAnalysisDocument ref={documentRef} summary={summary} sections={sections} />
                </div>
              )}
            </section>

            {!detailOpen && (
              <div className="absolute -left-[9999px] top-0 w-[794px]" aria-hidden="true">
                <ForwardedAnalysisDocument ref={documentRef} summary={summary} sections={sections} />
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

function SummaryCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: 'blue' | 'green' | 'amber' | 'violet' | 'cyan' | 'rose' }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-500/10 dark:border-blue-500/20',
    green: 'bg-green-50 text-green-600 border-green-100 dark:bg-green-500/10 dark:border-green-500/20',
    amber: 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-500/10 dark:border-amber-500/20',
    violet: 'bg-violet-50 text-violet-600 border-violet-100 dark:bg-violet-500/10 dark:border-violet-500/20',
    cyan: 'bg-cyan-50 text-cyan-600 border-cyan-100 dark:bg-cyan-500/10 dark:border-cyan-500/20',
    rose: 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-500/10 dark:border-rose-500/20',
  };

  return (
    <div className={`rounded-xl border p-4 ${tones[tone]}`}>
      <div className="flex items-center gap-2 text-xs font-semibold mb-2">{icon}<span>{label}</span></div>
      <p className="text-sm leading-6 text-[var(--color-text)] whitespace-pre-line">{value}</p>
    </div>
  );
}

const AnalysisDocument = ({ summary, sections }: { summary: AnnouncementSummary; sections: ReturnType<typeof splitSections> }, ref: React.ForwardedRef<HTMLDivElement>) => (
  <div ref={ref} className="bg-white text-slate-800 max-w-3xl mx-auto rounded-lg shadow-sm p-6 sm:p-10" style={{ fontFamily: 'Arial, "Malgun Gothic", sans-serif' }}>
    <header className="border-b-2 border-emerald-700 pb-5 mb-7">
      <p className="text-xs font-bold text-emerald-700 tracking-wide mb-2">VILLAGE AI SECRETARY</p>
      <h2 className="text-2xl font-bold text-slate-900">공고문 분석 보고서</h2>
      <p className="text-sm text-slate-500 mt-2">{summary.documentType} · {summary.organization} · {summary.date}</p>
    </header>

    {sections.map((section, index) => (
      <section key={`${section.title}-${index}`} className="pdf-section mb-7 break-inside-avoid">
        <h3 className="text-base font-bold text-slate-900 border-l-4 border-emerald-600 pl-3 mb-3">{section.title}</h3>
        <div className="space-y-2 text-sm leading-7 text-slate-700">
          {section.lines.map((line, lineIndex) => {
            const clean = stripMarkdown(line);
            if (!clean) return <div key={lineIndex} className="h-1" />;
            const indent = Math.max(0, line.match(/^\s*/)?.[0].length ?? 0);
            const isBullet = /^\s*[-*]\s+/.test(line);
            return isBullet
              ? <div key={lineIndex} className="flex gap-2" style={{ marginLeft: `${Math.min(indent, 6) * 5}px` }}><span className="mt-[11px] w-1 h-1 rounded-full bg-emerald-600 shrink-0" /><span>{clean}</span></div>
              : <p key={lineIndex}>{clean}</p>;
          })}
        </div>
      </section>
    ))}

    <footer className="pt-4 border-t border-slate-200 text-xs text-slate-400">본 문서는 AI가 공고문 내용을 분석해 정리한 참고용 자료입니다. 신청 전 원문 공고문을 확인하세요.</footer>
  </div>
);

const ForwardedAnalysisDocument = React.forwardRef(AnalysisDocument);

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
}
