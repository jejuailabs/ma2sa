'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText, Loader2, Copy, Check, Download } from 'lucide-react';
import { AccessGuard } from '@/components/auth/AccessGuard';
import { BottomTabBar } from '@/components/common/BottomTabBar';

const TEMPLATES = [
  { value: 'notice', label: '공지문/안내문', desc: '마을 주민 대상 공지사항' },
  { value: 'report', label: '보고서/결과보고', desc: '상급기관 제출용 보고서' },
  { value: 'proposal', label: '사업계획서', desc: '보조금·지원사업 신청용' },
  { value: 'letter', label: '협조공문', desc: '관공서·단체 협조 요청문' },
  { value: 'minutes', label: '회의록', desc: '마을회의 결과 공식 기록' },
  { value: 'budget', label: '예산서/결산서', desc: '마을 자금 관련 문서' },
];

export default function FormatPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [template, setTemplate] = useState('notice');
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const convert = async () => {
    if (!input.trim()) { setError('변환할 내용을 입력해주세요.'); return; }
    setLoading(true);
    setError('');
    try {
      const templateLabel = TEMPLATES.find((t) => t.value === template)?.label ?? template;
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feature: 'format',
          system: `당신은 한국 마을 행정 문서 전문가입니다. 사용자가 입력한 초안/메모를 공식 "${templateLabel}" 양식으로 변환합니다.

변환 규칙:
1. 대한민국 공문서 표준 양식을 따릅니다
2. 문서번호, 날짜, 수신/발신 등 형식적 요소를 포함합니다
3. 존댓말과 공식적 어투를 사용합니다
4. 원본의 핵심 내용은 빠짐없이 포함합니다
5. 마을 행정에 맞는 적절한 용어를 사용합니다

출력은 완성된 문서 텍스트만 제공하세요.`,
          messages: [{
            role: 'user',
            content: `다음 내용을 "${templateLabel}" 양식으로 변환해주세요:\n\n${input}`,
          }],
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setResult(data.text);
    } catch (e) {
      setError(e instanceof Error ? e.message : '변환에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const copyResult = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadTxt = () => {
    const blob = new Blob([result], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${TEMPLATES.find((t) => t.value === template)?.label}_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AccessGuard villageId={id} adminOnly>
      <div className="min-h-screen pb-20 md:pb-0 bg-[var(--color-bg)]">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-6">
            <Link href={`/village/${id}/ai`} className="p-2 rounded-lg hover:bg-[var(--color-surface)]">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center">
                <FileText className="w-4 h-4 text-purple-500" />
              </div>
              <h1 className="text-xl font-bold">텍스트 → 양식 변환</h1>
            </div>
          </div>

          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 mb-4">
            <label className="block mb-4">
              <span className="text-sm font-medium mb-2 block">문서 양식 선택</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {TEMPLATES.map((t) => (
                  <button key={t.value} onClick={() => setTemplate(t.value)} className={`p-3 rounded-xl text-left transition-all ${template === t.value ? 'bg-primary text-white' : 'bg-[var(--color-bg)] border border-[var(--color-border)] hover:border-primary'}`}>
                    <span className="text-sm font-medium block">{t.label}</span>
                    <span className={`text-xs ${template === t.value ? 'text-white/70' : 'text-[var(--color-text-secondary)]'}`}>{t.desc}</span>
                  </button>
                ))}
              </div>
            </label>

            <label className="block mb-4">
              <span className="text-sm font-medium mb-2 block">내용 입력</span>
              <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={8} placeholder="변환할 내용을 자유롭게 입력하세요. 메모, 초안, 키워드 등 어떤 형태든 괜찮습니다.&#10;&#10;예: 12월 15일 마을회관에서 주민총회 합니다. 안건은 내년도 예산 심의, 마을 도로 보수 건. 저녁 6시." className="w-full px-4 py-3 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl resize-none focus:outline-none focus:border-primary" />
            </label>

            <button onClick={convert} disabled={loading || !input.trim()} className="w-full py-3 rounded-xl bg-primary text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> 변환 중...</> : '양식 변환하기'}
            </button>
          </div>

          {error && <div className="p-4 rounded-xl bg-red-50 text-error text-sm mb-4">{error}</div>}

          {result && (
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6">
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
              <div className="bg-[var(--color-bg)] rounded-xl p-5 font-mono text-sm whitespace-pre-wrap leading-relaxed">{result}</div>
            </div>
          )}
        </div>
      </div>
      <BottomTabBar />
    </AccessGuard>
  );
}
