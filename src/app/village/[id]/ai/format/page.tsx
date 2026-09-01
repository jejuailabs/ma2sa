'use client';

import { useEffect, useState, useRef } from 'react';
import { FileText, Loader2, Copy, Check, Download, Upload, Eye, X, FileUp, FileCheck2 } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { getVillage, saveAITask, updateAITask } from '@/lib/firebase/firestore';
import { uploadFile } from '@/lib/firebase/storage';
import { useAuth } from '@/hooks/useAuth';
import type { FormDefaults } from '@/types/village';

type TemplateField = { id: string; label: string; hint: string };
type OutputFile = { url: string; name: string; type: string };
const EMPTY_FORM_DEFAULTS: FormDefaults = { organizationName: '', representativeName: '', representativePhone: '', contactName: '', contactPhone: '', email: '' };

export default function FormatPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { user } = useAuth();
  const sourceFileRef = useRef<HTMLInputElement>(null);
  const templateFileRef = useRef<HTMLInputElement>(null);
  const pdfDocumentRef = useRef<HTMLDivElement>(null);

  const [sourceText, setSourceText] = useState('');
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourcePreview, setSourcePreview] = useState('');

  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [templatePreview, setTemplatePreview] = useState('');
  const [templateText, setTemplateText] = useState('');
  const [templateFields, setTemplateFields] = useState<TemplateField[]>([]);
  const [formDefaults, setFormDefaults] = useState<FormDefaults>(EMPTY_FORM_DEFAULTS);
  const [templateInspecting, setTemplateInspecting] = useState(false);
  const [showTemplatePreview, setShowTemplatePreview] = useState(false);

  const [result, setResult] = useState('');
  const [outputFile, setOutputFile] = useState<OutputFile | null>(null);
  const [loading, setLoading] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getVillage(id).then((village) => {
      if (!village) return;
      setFormDefaults({ ...EMPTY_FORM_DEFAULTS, ...village.formDefaults, organizationName: village.formDefaults?.organizationName || village.name || '' });
    }).catch(() => {});
  }, [id]);

  const extractText = async (f: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', f);
    const res = await fetch('/api/ai/extract-text', { method: 'POST', body: formData });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || '파일 텍스트 추출에 실패했습니다.');
    if (data.unsupported) throw new Error(data.unsupported);
    return data.text || '';
  };

  const handleSourceFile = async (f: File) => {
    setSourceFile(f);
    setError('');
    if (f.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setSourcePreview(reader.result as string);
      reader.readAsDataURL(f);
    } else {
      setSourcePreview('');
      try {
        const text = await extractText(f);
        if (text) setSourceText(text);
      } catch (e) {
        setError(e instanceof Error ? e.message : '원문 파일을 읽을 수 없습니다.');
      }
    }
  };

  const handleTemplateFile = async (f: File) => {
    setTemplateFile(f);
    setTemplatePreview('');
    setTemplateText('');
    setTemplateFields([]);
    setOutputFile(null);
    setError('');
    setTemplateInspecting(true);
    try {
      if (f.name.toLowerCase().endsWith('.pdf')) {
        const text = await extractText(f);
        setTemplateText(text);
        return;
      }
      const formData = new FormData();
      formData.append('file', f);
      const res = await fetch('/api/ai/template/inspect', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || '양식 분석에 실패했습니다.');
      setTemplateText(data.text || '');
      setTemplateFields(data.fields || []);
      if (!(data.fields || []).length) setError('양식에서 자동으로 채울 칸을 찾지 못했습니다. HWPX/DOCX에는 {{항목명}} 자리표시자나 입력 칸 옆 항목명을, XLSX에는 입력 칸 왼쪽의 항목명을 넣어주세요.');
    } catch (e) {
      setTemplateFile(null);
      setError(e instanceof Error ? e.message : 'PDF, HWPX, DOCX, XLSX 양식 파일만 지원합니다.');
    } finally {
      setTemplateInspecting(false);
    }
  };

  const convert = async () => {
    if (!sourceText.trim() && !sourceFile) { setError('변환할 원문을 입력하거나 파일을 첨부해주세요.'); return; }
    if (!templateFile) { setError('PDF, HWPX, DOCX 또는 XLSX 양식 파일을 업로드해주세요.'); return; }
    const isPdfTemplate = templateFile.name.toLowerCase().endsWith('.pdf');
    if (!isPdfTemplate && !templateFields.length) { setError('양식에서 채울 수 있는 항목을 찾지 못했습니다. 양식 분석을 다시 확인해주세요.'); return; }
    setLoading(true);
    setError('');
    setOutputFile(null);
    let taskId = '';
    let storedTemplateData: { templateUrl: string; templateName: string } | null = null;
    try {
      try {
        taskId = await saveAITask(id, {
          type: 'format', title: `양식 변환${templateFile ? ` (${templateFile.name})` : ''}`,
          inputText: sourceText, inputImages: [], outputText: '', outputData: null,
          createdBy: user?.uid || '', status: 'processing', stage: '양식 변환 중...', errorMessage: '',
        });
        // 나중에 결과 파일을 다시 확인하거나 복원할 수 있도록 원본 양식도 작업 기록에 보관한다.
        const templateUrl = await uploadFile(
          `villages/${id}/aiTasks/${taskId}/template-${templateFile.name}`,
          templateFile,
        );
        storedTemplateData = { templateUrl, templateName: templateFile.name };
        await updateAITask(id, taskId, {
          outputData: storedTemplateData,
          stage: '원본 양식 저장 완료 · 양식 변환 중...',
        });
        const imageFiles = [sourceFile].filter((candidate): candidate is File => Boolean(candidate?.type.startsWith('image/')));
        if (taskId && imageFiles.length) {
          void Promise.all(imageFiles.map((image, index) => uploadFile(`villages/${id}/aiTasks/${taskId}/input-${index}-${image.name}`, image)))
            .then((inputImages) => updateAITask(id, taskId, { inputImages }))
            .catch(() => {});
        }
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : '작업 기록 또는 원본 양식을 저장하지 못했습니다.';
        if (taskId) {
          try { await updateAITask(id, taskId, { status: 'failed', stage: '원본 양식 저장 실패', errorMessage: message }); } catch {}
        }
        setError(`결과물을 다시 내려받을 수 있도록 원본 양식 저장이 필요합니다. ${message}`);
        return;
      }
      const messages: Array<{ role: 'user'; content: string | Array<{ type: string; text?: string; source?: { type: string; media_type: string; data: string } }> }> = [];

      const contentParts: Array<{ type: string; text?: string; source?: { type: string; media_type: string; data: string } }> = [];

      if (sourceFile && sourceFile.type.startsWith('image/')) {
        const base64 = await fileToBase64(sourceFile);
        contentParts.push({ type: 'image', source: { type: 'base64', media_type: sourceFile.type, data: base64 } });
        contentParts.push({ type: 'text', text: '위 이미지가 변환할 원문입니다.' });
      }

      let instruction = isPdfTemplate ? '다음 원문 내용을 PDF 양식의 구성과 항목을 참고하여 완성된 행정 문서로 정리해주세요.\n\n' : '다음 원문 내용을 HWPX/DOCX/XLSX 양식의 각 입력 항목에 맞게 배정해주세요.\n\n';
      if (sourceText.trim()) instruction += `[원문 내용]\n${sourceText.trim()}\n\n`;
      if (isPdfTemplate) {
        instruction += `[참고 PDF에서 추출한 양식 내용]\n${templateText}\n\n`;
        instruction += '원문의 근거가 없는 정보는 추정하지 말고 빈칸 또는 “확인 필요”로 표시하세요.';
      } else {
        instruction += `[양식에서 찾은 입력 항목]\n${templateFields.map((field) => `- id: ${field.id}\n  항목: ${field.label}\n  안내: ${field.hint}`).join('\n')}\n\n`;
        const defaultsText = getRegisteredDefaultsText(formDefaults);
        if (defaultsText) instruction += `[마을에 등록된 기본값 - 같은 항목에는 이 값을 우선 사용]\n${defaultsText}\n\n`;
        instruction += '각 항목에 넣을 값만 작성하세요. 원문에 근거가 없으면 빈 문자열로 두세요.';
      }

      if (contentParts.length > 0) {
        contentParts.push({ type: 'text', text: instruction });
        messages.push({ role: 'user', content: contentParts });
      } else {
        messages.push({ role: 'user', content: instruction });
      }

      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feature: 'format',
          system: isPdfTemplate ? `당신은 한국 마을 행정 문서 작성 전문가입니다. 참고 PDF의 항목과 순서를 최대한 따르되, 원문에 근거가 없는 정보는 추정하지 마세요. 완성된 문서 본문만 출력하세요.` : `당신은 한국 마을 행정 문서의 양식 입력 전문가입니다. 원본 양식의 구조와 서식은 프로그램이 보존하므로 절대 문서를 새로 작성하지 마세요.

규칙:
1. 제공된 항목 id만 사용합니다.
2. 원문에 명확한 근거가 있는 내용만 넣습니다.
3. 알 수 없는 내용은 반드시 빈 문자열로 둡니다.
4. 각 값은 해당 칸에 들어갈 수 있도록 간결하게 작성합니다.
5. 아래 JSON 외의 설명이나 마크다운을 절대 출력하지 마세요.

출력 형식:
{"fields":[{"id":"양식 id","value":"채울 내용 또는 빈 문자열"}]}`,
          messages,
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);
      if (isPdfTemplate) {
        setResult(data.text);
        try { if (taskId) await updateAITask(id, taskId, { outputText: data.text, outputData: { format: 'pdf' }, status: 'completed', stage: 'PDF 문서 초안 생성 완료', errorMessage: '' }); } catch {}
        return;
      }
      const values = applyRegisteredDefaults(parseTemplateValues(data.text, templateFields), templateFields, formDefaults);
      const fillFormData = new FormData();
      fillFormData.append('file', templateFile);
      fillFormData.append('values', JSON.stringify(values));
      const fillResponse = await fetch('/api/ai/template/fill', { method: 'POST', body: fillFormData });
      if (!fillResponse.ok) {
        const fillError = await fillResponse.json().catch(() => ({}));
        throw new Error(fillError.error || '양식 파일을 채우지 못했습니다.');
      }
      const fileBlob = await fillResponse.blob();
      const outputName = templateFile.name.replace(/\.(hwpx|docx|xlsx)$/i, `_작성본.$1`);
      const output = { url: URL.createObjectURL(fileBlob), name: outputName, type: fileBlob.type };
      const resultText = templateFields.map((field) => `- ${field.label}: ${values[field.id] || '(비워 둠)'}`).join('\n');
      setOutputFile(output);
      setResult(resultText);
      if (taskId) {
        const fileUrl = await uploadFile(
          `villages/${id}/aiTasks/${taskId}/${outputName}`,
          new File([fileBlob], outputName, { type: fileBlob.type || 'application/octet-stream' }),
        );
        await updateAITask(id, taskId, {
          outputText: resultText,
          outputData: { ...storedTemplateData, fileUrl, fileName: outputName, mimeType: fileBlob.type },
          status: 'completed',
          stage: '원본 양식 채우기 및 결과 파일 저장 완료',
          errorMessage: '',
        });
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : '변환에 실패했습니다.';
      setError(message);
      try { if (taskId) await updateAITask(id, taskId, { status: 'failed', stage: '변환 실패', errorMessage: message }); } catch {}
    } finally {
      setLoading(false);
    }
  };

  const copyResult = () => { navigator.clipboard.writeText(result); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const downloadTxt = () => {
    const blob = new Blob([result], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `양식변환_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const downloadOutputFile = () => {
    if (!outputFile) return;
    const a = document.createElement('a');
    a.href = outputFile.url;
    a.download = outputFile.name;
    a.click();
  };
  const downloadGeneratedPdf = async () => {
    if (!pdfDocumentRef.current) return;
    setExportingPdf(true);
    try {
      const { default: html2pdf } = await import('html2pdf.js');
      const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
      await html2pdf().set({ filename: `양식변환_${date}.pdf`, margin: [14, 14, 14, 14], image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, backgroundColor: '#ffffff' }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } }).from(pdfDocumentRef.current).save();
    } catch {
      setError('PDF 다운로드를 만들지 못했습니다. 다시 시도해주세요.');
    } finally {
      setExportingPdf(false);
    }
  };
  const isPdfTemplate = templateFile?.name.toLowerCase().endsWith('.pdf') ?? false;

  return (
    <DashboardShell villageId={id}>
      <div className="max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-purple-500" />
          </div>
          <h1 className="text-xl font-bold">텍스트 → 양식 변환</h1>
        </div>

        {/* Step 1: 원문 입력 */}
        <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-6 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">1</span>
            <span className="font-bold">원문 입력</span>
            <span className="text-xs text-[var(--color-text-secondary)]">변환할 내용을 입력하거나 파일을 첨부하세요</span>
          </div>

          <input ref={sourceFileRef} type="file" accept="image/*,.txt,.pdf,.doc,.docx,.hwp,.hwpx" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleSourceFile(e.target.files[0]); e.target.value = ''; }} />

          {sourceFile && sourcePreview && (
            <div className="mb-3 relative">
              <img src={sourcePreview} alt="원문 미리보기" className="max-h-48 rounded-xl border border-[var(--color-border)]" />
              <button onClick={() => { setSourceFile(null); setSourcePreview(''); }} className="absolute top-2 right-2 p-1 rounded-full bg-black/50 text-white"><X className="w-4 h-4" /></button>
            </div>
          )}
          {sourceFile && !sourcePreview && (
            <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
              <FileText className="w-4 h-4 text-purple-500" />
              <span className="text-sm flex-1 truncate">{sourceFile.name}</span>
              <button onClick={() => { setSourceFile(null); setSourceText(''); }} className="text-xs text-error">제거</button>
            </div>
          )}

          <textarea value={sourceText} onChange={(e) => setSourceText(e.target.value)} rows={6} placeholder="변환할 내용을 자유롭게 입력하세요. 메모, 초안, 키워드 등 어떤 형태든 괜찮습니다.&#10;&#10;예: 12월 15일 마을회관에서 주민총회 합니다. 안건은 내년도 예산 심의, 마을 도로 보수 건. 저녁 6시." className="w-full px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl resize-none focus:outline-none focus:border-primary mb-2" />

          <button onClick={() => sourceFileRef.current?.click()} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--color-border)] text-sm hover:border-primary">
            <Upload className="w-4 h-4" /> 파일 첨부 (이미지, 문서)
          </button>
        </div>

        {/* Step 2: 양식 업로드 */}
        <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-6 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">2</span>
            <span className="font-bold">양식 업로드</span>
            <span className="text-xs text-[var(--color-text-secondary)]">변환할 양식/템플릿을 업로드하세요</span>
          </div>

          <input ref={templateFileRef} type="file" accept=".pdf,.docx,.hwpx,.xlsx" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleTemplateFile(e.target.files[0]); e.target.value = ''; }} />

          {!templateFile ? (
            <button onClick={() => templateFileRef.current?.click()} className="w-full h-36 rounded-xl border-2 border-dashed border-[var(--color-border)] flex flex-col items-center justify-center gap-2 hover:border-primary transition-colors">
              <FileUp className="w-8 h-8 text-[var(--color-text-secondary)]" />
              <span className="text-sm text-[var(--color-text-secondary)]">클릭하여 PDF · HWPX · DOCX · XLSX 양식 업로드</span>
              <span className="text-xs text-[var(--color-text-secondary)]">HWPX/DOCX/XLSX는 원본 입력 칸을 채우고, PDF는 참고 양식으로 새 PDF를 만듭니다</span>
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
                <FileText className="w-4 h-4 text-purple-500" />
                <span className="text-sm flex-1 truncate">{templateFile.name}</span>
                <button onClick={() => setShowTemplatePreview(!showTemplatePreview)} className="flex items-center gap-1 text-xs text-primary hover:underline">
                  <Eye className="w-3.5 h-3.5" /> {showTemplatePreview ? '닫기' : '미리보기'}
                </button>
                <button onClick={() => { setTemplateFile(null); setTemplatePreview(''); setTemplateText(''); setTemplateFields([]); setOutputFile(null); setShowTemplatePreview(false); }} className="text-xs text-error">제거</button>
              </div>

              {templateInspecting ? (
                <div className="flex items-center gap-2 text-xs text-primary"><Loader2 className="w-3.5 h-3.5 animate-spin" /> 양식의 입력 칸을 찾는 중...</div>
              ) : isPdfTemplate ? (
                <div className="rounded-xl border border-primary/20 bg-primary-light/40 p-3 text-xs text-[var(--color-text-secondary)]">
                  PDF의 구성과 항목을 참고해, 분석된 원문으로 정돈된 새 PDF 결과물을 만듭니다.
                </div>
              ) : templateFields.length > 0 && (
                <div className="rounded-xl border border-primary/20 bg-primary-light/40 p-3">
                  <p className="flex items-center gap-1.5 text-xs font-bold text-primary mb-2"><FileCheck2 className="w-3.5 h-3.5" /> 채울 항목 {templateFields.length}개를 찾았습니다</p>
                  <div className="flex flex-wrap gap-1.5">{templateFields.slice(0, 12).map((field) => <span key={field.id} className="px-2 py-1 rounded-md bg-white/80 text-[11px] text-[var(--color-text)] border border-primary/10">{field.label}</span>)}</div>
                  {getRegisteredDefaultsText(formDefaults) && <p className="mt-2 text-[11px] text-[var(--color-text-secondary)]">등록된 양식 기본값을 자동 적용합니다.</p>}
                </div>
              )}

              {showTemplatePreview && (
                <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
                  {templatePreview ? (
                    <img src={templatePreview} alt="양식 미리보기" className="w-full max-h-96 object-contain bg-white" />
                  ) : templateText ? (
                    <div className="p-4 bg-[var(--color-surface)] max-h-64 overflow-auto">
                      <pre className="text-xs whitespace-pre-wrap font-mono">{templateText}</pre>
                    </div>
                  ) : (
                    <div className="p-4 text-center text-sm text-[var(--color-text-secondary)]">미리보기를 지원하지 않는 파일 형식입니다</div>
                  )}
                </div>
              )}

              <button onClick={() => templateFileRef.current?.click()} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--color-border)] text-sm hover:border-primary">
                <Upload className="w-4 h-4" /> 다른 양식으로 변경
              </button>
            </div>
          )}
        </div>

        {/* Convert Button */}
        <button onClick={convert} disabled={loading || templateInspecting || (!sourceText.trim() && !sourceFile) || !templateFile || (!isPdfTemplate && !templateFields.length)} className="w-full py-4 rounded-xl bg-primary text-white font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-50 mb-4">
          {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> {isPdfTemplate ? 'PDF 문서 만드는 중...' : '원본 양식에 채우는 중...'}</> : isPdfTemplate ? '참고 양식으로 PDF 만들기' : '원본 양식 채우기'}
        </button>

        {error && <div className="p-4 rounded-xl bg-red-50 text-error text-sm mb-4">{error}</div>}

        {result && (
          <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div><h3 className="font-bold">작성된 양식</h3><p className="text-xs text-[var(--color-text-secondary)] mt-1">원본 표와 서식은 유지하고 확인 가능한 내용만 채웠습니다.</p></div>
              <div className="flex gap-2">
                <button onClick={copyResult} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs border border-[var(--color-border)] hover:border-primary">
                  {copied ? <><Check className="w-3.5 h-3.5" /> 복사됨</> : <><Copy className="w-3.5 h-3.5" /> 복사</>}
                </button>
                <button onClick={downloadTxt} className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs border border-[var(--color-border)] hover:border-primary"><Download className="w-3.5 h-3.5" /> 입력 요약</button>
                {outputFile && <button onClick={downloadOutputFile} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-primary text-white hover:opacity-90"><Download className="w-3.5 h-3.5" /> {outputFile.name.toLowerCase().endsWith('.hwpx') ? 'HWPX' : outputFile.name.toLowerCase().endsWith('.xlsx') ? 'XLSX' : 'DOCX'} 다운로드</button>}
                {isPdfTemplate && <button onClick={downloadGeneratedPdf} disabled={exportingPdf} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-primary text-white hover:opacity-90 disabled:opacity-50"><Download className="w-3.5 h-3.5" /> {exportingPdf ? 'PDF 생성 중...' : 'PDF 다운로드'}</button>}
              </div>
            </div>
            <div className="bg-[var(--color-surface)] rounded-xl p-5 font-mono text-sm whitespace-pre-wrap leading-relaxed">{result}</div>
          </div>
        )}
        {isPdfTemplate && result && (
          <div className="absolute -left-[9999px] top-0 w-[794px] bg-white text-slate-900" aria-hidden="true">
            <div ref={pdfDocumentRef} className="p-12" style={{ fontFamily: 'Arial, Malgun Gothic, sans-serif' }}>
              <p className="mb-2 text-xs font-bold tracking-[0.2em] text-emerald-700">VILLAGE AI SECRETARY</p>
              <h2 className="mb-2 text-2xl font-bold">양식 변환 결과</h2>
              <p className="mb-8 border-b border-slate-300 pb-4 text-sm text-slate-500">참고 양식: {templateFile?.name}</p>
              <div className="whitespace-pre-wrap text-[15px] leading-8">{result}</div>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

function parseTemplateValues(responseText: string, fields: TemplateField[]) {
  const json = responseText.match(/\{[\s\S]*\}/)?.[0];
  if (!json) throw new Error('AI가 양식 입력 값을 올바른 형식으로 만들지 못했습니다. 다시 시도해주세요.');
  let parsed: { fields?: Array<{ id?: string; value?: string }> };
  try {
    parsed = JSON.parse(json) as { fields?: Array<{ id?: string; value?: string }> };
  } catch {
    throw new Error('AI가 양식 입력 값을 올바른 JSON으로 만들지 못했습니다. 다시 시도해주세요.');
  }
  const allowed = new Set(fields.map((field) => field.id));
  const values: Record<string, string> = Object.fromEntries(fields.map((field) => [field.id, '']));
  parsed.fields?.forEach((field) => {
    if (field.id && allowed.has(field.id)) values[field.id] = typeof field.value === 'string' ? field.value.trim() : '';
  });
  return values;
}

function getRegisteredDefaultsText(defaults: FormDefaults) {
  return [
    ['마을명/단체명', defaults.organizationName], ['대표자', defaults.representativeName], ['대표자 연락처', defaults.representativePhone],
    ['담당자', defaults.contactName], ['담당자 연락처', defaults.contactPhone], ['이메일', defaults.email],
  ].filter(([, value]) => Boolean(value)).map(([label, value]) => `- ${label}: ${value}`).join('\n');
}

function applyRegisteredDefaults(values: Record<string, string>, fields: TemplateField[], defaults: FormDefaults) {
  fields.forEach((field) => {
    const label = field.label.replace(/\s+/g, '');
    const defaultValue = /마을명|단체명/.test(label) ? defaults.organizationName
      : /대표자.*연락|연락.*대표자/.test(label) ? defaults.representativePhone
        : /대표자/.test(label) ? defaults.representativeName
          : /담당자.*연락|연락.*담당자/.test(label) ? defaults.contactPhone
            : /담당자/.test(label) ? defaults.contactName
              : /이메일|e-?mail/i.test(label) ? defaults.email : '';
    if (defaultValue) values[field.id] = defaultValue;
  });
  return values;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
}
