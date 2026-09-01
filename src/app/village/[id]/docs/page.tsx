'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, Receipt, Mic, Volume2, FileSearch, ClipboardList, Search, Loader2, Trash2, ChevronDown, ChevronUp, AlertCircle, Clock3, CheckCircle2 } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { subscribeAITasks, deleteAITask } from '@/lib/firebase/firestore';
import type { AITask, AITaskType } from '@/types/feed';

const TYPE_CONFIG: Record<AITaskType, { icon: typeof FileText; label: string; color: string; bg: string }> = {
  announcement: { icon: FileSearch, label: '공고문 분석', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
  receipt: { icon: Receipt, label: '영수증→엑셀', color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-500/10' },
  format: { icon: FileText, label: '양식 변환', color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-500/10' },
  transcribe: { icon: Mic, label: '회의록 정리', color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-500/10' },
  narration: { icon: Volume2, label: '대신 읽어주기', color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-500/10' },
};

interface ReceiptRow { date: string; item: string; quantity: string; unitPrice: string; amount: string; store: string; category: string; note: string }

const STATUS_CONFIG = {
  draft: { label: '중간 저장', className: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300', icon: Clock3 },
  processing: { label: '처리 중', className: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300', icon: Loader2 },
  completed: { label: '완료', className: 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300', icon: CheckCircle2 },
  failed: { label: '실패', className: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300', icon: AlertCircle },
};

export default function AITaskListPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [tasks, setTasks] = useState<AITask[]>([]);
  const [filter, setFilter] = useState<'all' | AITaskType>('all');
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeAITasks(id, filter === 'all' ? undefined : filter, (nextTasks) => {
      setTasks(nextTasks);
      setLoading(false);
    }, () => setLoading(false));
    return unsubscribe;
  }, [id, filter]);

  const handleDelete = async (taskId: string) => {
    if (!confirm('이 작업 기록을 삭제하시겠습니까?')) return;
    try {
      await deleteAITask(id, taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      if (expandedId === taskId) setExpandedId(null);
    } catch {}
  };

  const filtered = tasks.filter((t) =>
    !searchText || t.title.includes(searchText) || t.inputText?.includes(searchText) || t.outputText?.includes(searchText)
  );

  return (
    <DashboardShell villageId={id}>
      <div className="max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-500/10 flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-gray-600" />
          </div>
          <h1 className="text-xl font-bold">AI 업무 목록</h1>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          {[{ value: 'all' as const, label: '전체' }, ...Object.entries(TYPE_CONFIG).map(([v, c]) => ({ value: v as AITaskType, label: c.label }))].map((f) => (
            <button key={f.value} onClick={() => { setFilter(f.value); setLoading(true); }} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filter === f.value ? 'bg-primary text-white' : 'bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-primary'}`}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)]" />
          <input value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="업무 기록 검색..." className="w-full pl-10 pr-4 py-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl text-sm focus:outline-none focus:border-primary" />
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <ClipboardList className="w-12 h-12 text-[var(--color-text-secondary)] mx-auto mb-3" />
            <p className="text-[var(--color-text-secondary)] mb-2">
              {tasks.length === 0 ? '아직 AI 업무 기록이 없습니다' : '검색 결과가 없습니다'}
            </p>
            <p className="text-xs text-[var(--color-text-secondary)]">AI 기능을 사용하면 작업 결과가 자동으로 저장됩니다</p>
            <Link href={`/village/${id}/ai`} className="inline-block mt-4 px-4 py-2 rounded-lg bg-primary text-white text-sm">AI 기능 바로가기</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((task) => {
              const cfg = TYPE_CONFIG[task.type];
              const Icon = cfg.icon;
              const isExpanded = expandedId === task.id;
              const status = STATUS_CONFIG[task.status || 'completed'];
              const StatusIcon = status.icon;

              return (
                <div key={task.id} className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl overflow-hidden">
                  {/* Header row */}
                  <button onClick={() => setExpandedId(isExpanded ? null : task.id)} className="w-full text-left p-4 flex items-center gap-3 hover:bg-[var(--color-surface)] transition-colors">
                    <div className={`w-9 h-9 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0`}>
                      <Icon className={`w-4 h-4 ${cfg.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{task.title}</p>
                      <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                        <span className="ml-2">{task.createdAt.toLocaleString('ko-KR')}</span>
                      </p>
                      <p className="text-xs text-[var(--color-text-secondary)] mt-1 truncate">{task.stage || '결과 저장 완료'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`hidden sm:flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${status.className}`}>
                        <StatusIcon className={`w-3 h-3 ${task.status === 'processing' ? 'animate-spin' : ''}`} /> {status.label}
                      </span>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(task.id); }} className="p-1.5 rounded-lg text-[var(--color-text-secondary)] hover:text-error hover:bg-error/10" title="삭제">
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-[var(--color-text-secondary)]" /> : <ChevronDown className="w-4 h-4 text-[var(--color-text-secondary)]" />}
                    </div>
                  </button>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-[var(--color-border)]">
                      <div className={`mt-4 flex items-start gap-2 rounded-lg px-3 py-2 text-xs ${status.className}`}>
                        <StatusIcon className={`w-4 h-4 shrink-0 mt-0.5 ${task.status === 'processing' ? 'animate-spin' : ''}`} />
                        <div><span className="font-bold">{status.label}</span><span className="ml-2">{task.stage || '결과 저장 완료'}</span>{task.errorMessage && <p className="mt-1 text-red-600">{task.errorMessage}</p>}</div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4 mt-4">
                        {/* Input */}
                        <div>
                          <h4 className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wide mb-2">원문 (입력)</h4>
                          <div className="bg-[var(--color-surface)] rounded-xl p-4 max-h-64 overflow-auto">
                            {task.inputImages?.length > 0 && (
                              <div className="flex gap-2 mb-3 flex-wrap">
                                {task.inputImages.map((img, i) => (
                                  <img key={i} src={img} alt="" className="h-20 rounded-lg object-cover border border-[var(--color-border)]" />
                                ))}
                              </div>
                            )}
                            {task.inputText ? (
                              <p className="text-sm whitespace-pre-wrap">{task.inputText}</p>
                            ) : (
                              <p className="text-sm text-[var(--color-text-secondary)]">(이미지 입력)</p>
                            )}
                          </div>
                        </div>

                        {/* Output */}
                        <div>
                          <h4 className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wide mb-2">결과 (출력)</h4>
                          <div className="bg-[var(--color-surface)] rounded-xl p-4 max-h-64 overflow-auto">
                            {task.type === 'receipt' && task.outputData ? (
                              <ReceiptTable rows={task.outputData as ReceiptRow[]} />
                            ) : task.type === 'narration' && getAudioUrl(task.outputData) ? (
                              <div className="space-y-2"><audio controls src={getAudioUrl(task.outputData)} className="w-full" /><p className="text-xs text-[var(--color-text-secondary)]">저장된 MP3 결과물</p></div>
                            ) : task.outputText ? (
                              <p className="text-sm whitespace-pre-wrap">{task.outputText}</p>
                            ) : (
                              <p className="text-sm text-[var(--color-text-secondary)]">{task.status === 'processing' ? '(AI가 결과를 만드는 중입니다)' : '(결과 없음)'}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

function getAudioUrl(outputData: unknown) {
  if (!outputData || typeof outputData !== 'object' || !('audioUrl' in outputData)) return '';
  const audioUrl = (outputData as { audioUrl?: unknown }).audioUrl;
  return typeof audioUrl === 'string' ? audioUrl : '';
}

function ReceiptTable({ rows }: { rows: ReceiptRow[] }) {
  const total = rows.reduce((s, r) => s + (parseInt(r.amount) || 0), 0);
  return (
    <div className="overflow-x-auto text-xs">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[var(--color-border)]">
            <th className="py-1 text-left">품목</th>
            <th className="py-1 text-right">수량</th>
            <th className="py-1 text-right">금액</th>
            {rows.some((r) => r.note) && <th className="py-1 text-left">비고</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-[var(--color-border)]/50">
              <td className="py-1">{r.item}</td>
              <td className="py-1 text-right">{r.quantity}</td>
              <td className="py-1 text-right">{parseInt(r.amount).toLocaleString()}</td>
              {rows.some((r) => r.note) && <td className="py-1 text-[var(--color-text-secondary)]">{r.note}</td>}
            </tr>
          ))}
          <tr className="font-bold">
            <td className="py-1">합계</td>
            <td />
            <td className="py-1 text-right text-primary">{total.toLocaleString()}원</td>
            {rows.some((r) => r.note) && <td />}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
