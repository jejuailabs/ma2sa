'use client';

import { useState, useRef } from 'react';
import { FileText, Loader2, Copy, Check, Download, Upload, Eye, X, ImagePlus, FileUp } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { saveAITask } from '@/lib/firebase/firestore';
import { useAuth } from '@/hooks/useAuth';

export default function FormatPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { user } = useAuth();
  const sourceFileRef = useRef<HTMLInputElement>(null);
  const templateFileRef = useRef<HTMLInputElement>(null);

  const [sourceText, setSourceText] = useState('');
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourcePreview, setSourcePreview] = useState('');

  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [templatePreview, setTemplatePreview] = useState('');
  const [templateText, setTemplateText] = useState('');
  const [showTemplatePreview, setShowTemplatePreview] = useState(false);

  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const extractText = async (f: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', f);
    const res = await fetch('/api/ai/extract-text', { method: 'POST', body: formData });
    const data = await res.json();
    return data.text || '';
  };

  const handleSourceFile = async (f: File) => {
    setSourceFile(f);
    if (f.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setSourcePreview(reader.result as string);
      reader.readAsDataURL(f);
    } else {
      setSourcePreview('');
      const text = await extractText(f);
      if (text) setSourceText(text);
    }
  };

  const handleTemplateFile = async (f: File) => {
    setTemplateFile(f);
    if (f.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setTemplatePreview(reader.result as string);
      reader.readAsDataURL(f);
    } else {
      setTemplatePreview('');
      const text = await extractText(f);
      if (text) setTemplateText(text);
    }
  };

  const convert = async () => {
    if (!sourceText.trim() && !sourceFile) { setError('변환할 원문을 입력하거나 파일을 첨부해주세요.'); return; }
    if (!templateFile && !templateText.trim()) { setError('변환할 양식 파일을 업로드해주세요.'); return; }
    setLoading(true);
    setError('');
    try {
      const messages: Array<{ role: 'user'; content: string | Array<{ type: string; text?: string; source?: { type: string; media_type: string; data: string } }> }> = [];

      const contentParts: Array<{ type: string; text?: string; source?: { type: string; media_type: string; data: string } }> = [];

      if (sourceFile && sourceFile.type.startsWith('image/')) {
        const base64 = await fileToBase64(sourceFile);
        contentParts.push({ type: 'image', source: { type: 'base64', media_type: sourceFile.type, data: base64 } });
        contentParts.push({ type: 'text', text: '위 이미지가 변환할 원문입니다.' });
      }

      if (templateFile && templateFile.type.startsWith('image/')) {
        const base64 = await fileToBase64(templateFile);
        contentParts.push({ type: 'image', source: { type: 'base64', media_type: templateFile.type, data: base64 } });
        contentParts.push({ type: 'text', text: '위 이미지가 변환할 양식(템플릿)입니다.' });
      }

      let instruction = '다음 원문 내용을 주어진 양식에 맞게 변환해주세요.\n\n';
      if (sourceText.trim()) instruction += `[원문 내용]\n${sourceText.trim()}\n\n`;
      if (templateText.trim()) instruction += `[변환할 양식]\n${templateText.trim()}\n\n`;
      instruction += '양식의 구조와 형태를 그대로 유지하면서, 원문의 내용을 양식에 맞게 채워 넣어주세요. 완성된 문서 텍스트만 출력하세요.';

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
          system: `당신은 한국 마을 행정 문서 전문가입니다. 사용자가 제공한 원문(텍스트, 메모, 초안 등)을 지정된 양식/템플릿에 맞게 변환합니다.

변환 규칙:
1. 양식의 구조, 레이아웃, 형식을 정확히 따릅니다
2. 원문의 핵심 내용은 빠짐없이 포함합니다
3. 존댓말과 공식적 어투를 사용합니다
4. 문서번호, 날짜, 수신/발신 등 양식에 포함된 형식적 요소를 유지합니다
5. 마을 행정에 맞는 적절한 용어를 사용합니다

출력은 완성된 문서 텍스트만 제공하세요.`,
          messages,
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setResult(data.text);
      try {
        await saveAITask(id, {
          type: 'format',
          title: `양식 변환${templateFile ? ` (${templateFile.name})` : ''}`,
          inputText: sourceText,
          inputImages: sourcePreview ? [sourcePreview] : [],
          outputText: data.text,
          outputData: null,
          createdBy: user?.uid || '',
        });
      } catch {}
    } catch (e) {
      setError(e instanceof Error ? e.message : '변환에 실패했습니다.');
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

          <input ref={templateFileRef} type="file" accept="image/*,.txt,.pdf,.doc,.docx,.hwp,.hwpx" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleTemplateFile(e.target.files[0]); e.target.value = ''; }} />

          {!templateFile ? (
            <button onClick={() => templateFileRef.current?.click()} className="w-full h-36 rounded-xl border-2 border-dashed border-[var(--color-border)] flex flex-col items-center justify-center gap-2 hover:border-primary transition-colors">
              <FileUp className="w-8 h-8 text-[var(--color-text-secondary)]" />
              <span className="text-sm text-[var(--color-text-secondary)]">클릭하여 양식 파일 업로드</span>
              <span className="text-xs text-[var(--color-text-secondary)]">이미지, HWP, DOCX, PDF, TXT</span>
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
                <FileText className="w-4 h-4 text-purple-500" />
                <span className="text-sm flex-1 truncate">{templateFile.name}</span>
                <button onClick={() => setShowTemplatePreview(!showTemplatePreview)} className="flex items-center gap-1 text-xs text-primary hover:underline">
                  <Eye className="w-3.5 h-3.5" /> {showTemplatePreview ? '닫기' : '미리보기'}
                </button>
                <button onClick={() => { setTemplateFile(null); setTemplatePreview(''); setTemplateText(''); setShowTemplatePreview(false); }} className="text-xs text-error">제거</button>
              </div>

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
        <button onClick={convert} disabled={loading || (!sourceText.trim() && !sourceFile) || (!templateFile && !templateText.trim())} className="w-full py-4 rounded-xl bg-primary text-white font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-50 mb-4">
          {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> 변환 중...</> : '양식 변환하기'}
        </button>

        {error && <div className="p-4 rounded-xl bg-red-50 text-error text-sm mb-4">{error}</div>}

        {result && (
          <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">변환 결과</h3>
              <div className="flex gap-2">
                <button onClick={copyResult} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs border border-[var(--color-border)] hover:border-primary">
                  {copied ? <><Check className="w-3.5 h-3.5" /> 복사됨</> : <><Copy className="w-3.5 h-3.5" /> 복사</>}
                </button>
                <button onClick={downloadTxt} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-primary text-white hover:opacity-90">
                  <Download className="w-3.5 h-3.5" /> 다운로드
                </button>
              </div>
            </div>
            <div className="bg-[var(--color-surface)] rounded-xl p-5 font-mono text-sm whitespace-pre-wrap leading-relaxed">{result}</div>
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
