'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Receipt, ImagePlus, Loader2, Download, Plus, Trash2 } from 'lucide-react';
import { AccessGuard } from '@/components/auth/AccessGuard';
import { BottomTabBar } from '@/components/common/BottomTabBar';

interface ReceiptRow {
  date: string;
  item: string;
  quantity: string;
  unitPrice: string;
  amount: string;
  store: string;
  category: string;
}

export default function ReceiptPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const fileRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<{ file: File; preview: string }[]>([]);
  const [rows, setRows] = useState<ReceiptRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [totalAmount, setTotalAmount] = useState(0);

  const addFile = (f: File) => {
    const reader = new FileReader();
    reader.onload = () => setFiles((prev) => [...prev, { file: f, preview: reader.result as string }]);
    reader.readAsDataURL(f);
  };

  const removeFile = (idx: number) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  const analyze = async () => {
    if (files.length === 0) return;
    setLoading(true);
    setError('');
    try {
      const allRows: ReceiptRow[] = [];
      for (const { file } of files) {
        const base64 = await new Promise<string>((res) => {
          const reader = new FileReader();
          reader.onload = () => res((reader.result as string).split(',')[1]);
          reader.readAsDataURL(file);
        });

        const response = await fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            feature: 'receipt',
            system: `영수증 이미지를 분석하여 JSON 배열로 변환합니다. 각 항목은 다음 필드를 포함해야 합니다:
- date: 날짜 (YYYY-MM-DD)
- item: 품목명
- quantity: 수량
- unitPrice: 단가 (숫자만)
- amount: 금액 (숫자만)
- store: 상호명
- category: 분류 (식료품/사무용품/시설관리/경조사/기타 중 하나)

반드시 유효한 JSON 배열만 출력하세요. 다른 텍스트는 포함하지 마세요.
예: [{"date":"2026-01-15","item":"쌀","quantity":"1","unitPrice":"50000","amount":"50000","store":"농협마트","category":"식료품"}]`,
            messages: [{
              role: 'user',
              content: [
                { type: 'image', source: { type: 'base64', media_type: file.type || 'image/jpeg', data: base64 } },
                { type: 'text', text: '이 영수증의 항목들을 JSON 배열로 변환해주세요.' },
              ],
            }],
          }),
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error);

        const jsonMatch = data.text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as ReceiptRow[];
          allRows.push(...parsed);
        }
      }

      setRows(allRows);
      setTotalAmount(allRows.reduce((sum, r) => sum + (parseInt(r.amount) || 0), 0));
    } catch (e) {
      setError(e instanceof Error ? e.message : '분석에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    const header = '날짜,품목,수량,단가,금액,상호,분류';
    const csvRows = rows.map((r) => `${r.date},${r.item},${r.quantity},${r.unitPrice},${r.amount},${r.store},${r.category}`);
    const bom = '﻿';
    const csv = bom + [header, ...csvRows, `,,,,${totalAmount},합계,`].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `영수증_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AccessGuard villageId={id} adminOnly>
      <div className="min-h-screen pb-20 md:pb-0 bg-[var(--color-bg)]">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-6">
            <Link href={`/village/${id}/ai`} className="p-2 rounded-lg hover:bg-[var(--color-surface)]">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-green-50 dark:bg-green-500/10 flex items-center justify-center">
                <Receipt className="w-4 h-4 text-green-500" />
              </div>
              <h1 className="text-xl font-bold">영수증 → 엑셀</h1>
            </div>
          </div>

          {/* Upload */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 mb-4">
            <p className="text-sm text-[var(--color-text-secondary)] mb-4">영수증 이미지를 업로드하면 AI가 항목을 인식해 표로 변환합니다. 여러 장 한번에 가능합니다.</p>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { Array.from(e.target.files || []).forEach(addFile); e.target.value = ''; }} />

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-4">
              {files.map((f, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden group">
                  <img src={f.preview} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => removeFile(i)} className="absolute top-1 right-1 p-1 rounded bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <button onClick={() => fileRef.current?.click()} className="aspect-square rounded-lg border-2 border-dashed border-[var(--color-border)] flex flex-col items-center justify-center gap-1 hover:border-primary transition-colors">
                <Plus className="w-6 h-6 text-[var(--color-text-secondary)]" />
                <span className="text-[10px] text-[var(--color-text-secondary)]">추가</span>
              </button>
            </div>

            {files.length > 0 && (
              <button onClick={analyze} disabled={loading} className="w-full py-3 rounded-xl bg-primary text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> 분석 중... ({files.length}장)</> : `영수증 분석하기 (${files.length}장)`}
              </button>
            )}
          </div>

          {error && <div className="p-4 rounded-xl bg-red-50 text-error text-sm mb-4">{error}</div>}

          {/* Results Table */}
          {rows.length > 0 && (
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold">분석 결과 ({rows.length}건)</h3>
                <button onClick={downloadCSV} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500 text-white text-sm font-medium hover:bg-green-600">
                  <Download className="w-3.5 h-3.5" /> CSV 다운로드
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-border)]">
                      <th className="py-2 px-2 text-left font-medium text-[var(--color-text-secondary)]">날짜</th>
                      <th className="py-2 px-2 text-left font-medium text-[var(--color-text-secondary)]">품목</th>
                      <th className="py-2 px-2 text-right font-medium text-[var(--color-text-secondary)]">수량</th>
                      <th className="py-2 px-2 text-right font-medium text-[var(--color-text-secondary)]">단가</th>
                      <th className="py-2 px-2 text-right font-medium text-[var(--color-text-secondary)]">금액</th>
                      <th className="py-2 px-2 text-left font-medium text-[var(--color-text-secondary)]">상호</th>
                      <th className="py-2 px-2 text-left font-medium text-[var(--color-text-secondary)]">분류</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} className="border-b border-[var(--color-border)]">
                        <td className="py-2 px-2">{r.date}</td>
                        <td className="py-2 px-2">{r.item}</td>
                        <td className="py-2 px-2 text-right">{r.quantity}</td>
                        <td className="py-2 px-2 text-right">{parseInt(r.unitPrice).toLocaleString()}</td>
                        <td className="py-2 px-2 text-right font-medium">{parseInt(r.amount).toLocaleString()}</td>
                        <td className="py-2 px-2">{r.store}</td>
                        <td className="py-2 px-2"><span className="px-2 py-0.5 rounded-full bg-primary-light text-primary text-xs">{r.category}</span></td>
                      </tr>
                    ))}
                    <tr className="font-bold">
                      <td colSpan={4} className="py-3 px-2 text-right">합계</td>
                      <td className="py-3 px-2 text-right text-primary">{totalAmount.toLocaleString()}원</td>
                      <td colSpan={2} />
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Category Summary */}
              <div className="mt-6 pt-4 border-t border-[var(--color-border)]">
                <h4 className="text-sm font-semibold mb-3">분류별 합계</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(rows.reduce<Record<string, number>>((acc, r) => {
                    acc[r.category] = (acc[r.category] || 0) + (parseInt(r.amount) || 0);
                    return acc;
                  }, {})).sort(([, a], [, b]) => b - a).map(([cat, amt]) => (
                    <div key={cat} className="flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--color-bg)]">
                      <span className="text-sm">{cat}</span>
                      <span className="text-sm font-medium">{amt.toLocaleString()}원</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <BottomTabBar />
    </AccessGuard>
  );
}
