'use client';

import { useEffect, useState } from 'react';
import { Wallet, Plus, Loader2, Trash2, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { isFirebaseConfigured, db } from '@/lib/firebase/config';
import { collection, query, orderBy, getDocs, addDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { formatCurrency } from '@/lib/utils';

interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string;
  memo?: string;
}

const EXPENSE_CATEGORIES = ['식료품', '사무용품', '시설관리', '경조사', '행사비', '인건비', '기타'];
const INCOME_CATEGORIES = ['보조금', '마을기금', '수익사업', '기부금', '기타'];

export default function FinancePage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', amount: '', type: 'expense' as 'income' | 'expense', category: '기타', date: new Date().toISOString().slice(0, 10), memo: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured || !db) { setLoading(false); return; }
    getDocs(query(collection(db, 'villages', id, 'finance'), orderBy('date', 'desc')))
      .then((snap) => {
        setTransactions(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Transaction)));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const addTransaction = async () => {
    if (!form.title.trim() || !form.amount || !db) return;
    setSaving(true);
    try {
      const txData = { ...form, amount: parseInt(form.amount), createdAt: Timestamp.now() };
      const docRef = await addDoc(collection(db, 'villages', id, 'finance'), txData);
      setTransactions((prev) => [{ id: docRef.id, ...txData }, ...prev].sort((a, b) => b.date.localeCompare(a.date)));
      setForm({ title: '', amount: '', type: 'expense', category: '기타', date: new Date().toISOString().slice(0, 10), memo: '' });
      setShowForm(false);
    } catch {} finally { setSaving(false); }
  };

  const deleteTransaction = async (txId: string) => {
    if (!db || !confirm('이 내역을 삭제하시겠습니까?')) return;
    try {
      await deleteDoc(doc(db, 'villages', id, 'finance', txId));
      setTransactions((prev) => prev.filter((t) => t.id !== txId));
    } catch {}
  };

  const totalIncome = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;
  const categories = form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <DashboardShell villageId={id}>
      <div className="max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-purple-600" />
            </div>
            <h1 className="text-xl font-bold">자금 관리</h1>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90">
            <Plus className="w-4 h-4" /> 내역 추가
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-xs text-[var(--color-text-secondary)]">총 수입</span>
            </div>
            <p className="text-lg font-bold text-green-600">{formatCurrency(totalIncome)}</p>
          </div>
          <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="w-4 h-4 text-red-500" />
              <span className="text-xs text-[var(--color-text-secondary)]">총 지출</span>
            </div>
            <p className="text-lg font-bold text-red-500">{formatCurrency(totalExpense)}</p>
          </div>
          <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="w-4 h-4 text-primary" />
              <span className="text-xs text-[var(--color-text-secondary)]">잔액</span>
            </div>
            <p className={`text-lg font-bold ${balance >= 0 ? 'text-primary' : 'text-red-500'}`}>{formatCurrency(balance)}</p>
          </div>
        </div>

        {showForm && (
          <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-6 mb-4">
            <h3 className="font-bold mb-4">새 내역</h3>
            <div className="flex gap-2 mb-3">
              <button onClick={() => setForm({ ...form, type: 'expense', category: '기타' })} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${form.type === 'expense' ? 'bg-red-500 text-white' : 'bg-[var(--color-surface)] border border-[var(--color-border)]'}`}>
                지출
              </button>
              <button onClick={() => setForm({ ...form, type: 'income', category: '기타' })} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${form.type === 'income' ? 'bg-green-500 text-white' : 'bg-[var(--color-surface)] border border-[var(--color-border)]'}`}>
                수입
              </button>
            </div>
            <div className="grid sm:grid-cols-2 gap-3 mb-3">
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="내역" className="px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:border-primary" />
              <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="금액 (원)" className="px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:border-primary" />
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:border-primary" />
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:border-primary">
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <input value={form.memo} onChange={(e) => setForm({ ...form, memo: e.target.value })} placeholder="메모 (선택)" className="w-full px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:border-primary mb-3" />
            <div className="flex gap-2">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-lg border border-[var(--color-border)] text-sm">취소</button>
              <button onClick={addTransaction} disabled={saving || !form.title.trim() || !form.amount} className="flex-1 py-2 rounded-lg bg-primary text-white text-sm font-medium disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : '추가'}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-16">
            <Wallet className="w-12 h-12 text-[var(--color-text-secondary)] mx-auto mb-3" />
            <p className="text-[var(--color-text-secondary)]">등록된 내역이 없습니다</p>
            <p className="text-xs text-[var(--color-text-secondary)] mt-1">"내역 추가" 버튼으로 수입/지출을 기록하세요</p>
          </div>
        ) : (
          <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                    <th className="py-3 px-4 text-left font-medium text-[var(--color-text-secondary)]">날짜</th>
                    <th className="py-3 px-4 text-left font-medium text-[var(--color-text-secondary)]">내역</th>
                    <th className="py-3 px-4 text-left font-medium text-[var(--color-text-secondary)]">분류</th>
                    <th className="py-3 px-4 text-right font-medium text-[var(--color-text-secondary)]">금액</th>
                    <th className="py-3 px-2 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr key={t.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface)] group">
                      <td className="py-3 px-4 text-[var(--color-text-secondary)]">{t.date}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {t.type === 'income' ? <ArrowDownRight className="w-3.5 h-3.5 text-green-500" /> : <ArrowUpRight className="w-3.5 h-3.5 text-red-500" />}
                          <span>{t.title}</span>
                        </div>
                        {t.memo && <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 ml-5.5">{t.memo}</p>}
                      </td>
                      <td className="py-3 px-4"><span className="px-2 py-0.5 rounded-full text-xs bg-[var(--color-surface)]">{t.category}</span></td>
                      <td className={`py-3 px-4 text-right font-medium ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                        {t.type === 'income' ? '+' : '-'}{t.amount.toLocaleString()}원
                      </td>
                      <td className="py-3 px-2">
                        <button onClick={() => deleteTransaction(t.id)} className="p-1.5 rounded-lg text-[var(--color-text-secondary)] hover:text-error opacity-0 group-hover:opacity-100">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
