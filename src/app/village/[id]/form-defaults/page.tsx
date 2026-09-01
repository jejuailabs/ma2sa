'use client';

import { useEffect, useState } from 'react';
import { FilePenLine, Loader2, Save, Check, AlertCircle } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { db, isFirebaseConfigured } from '@/lib/firebase/config';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import type { FormDefaults } from '@/types/village';

const EMPTY_DEFAULTS: FormDefaults = {
  organizationName: '', representativeName: '', representativePhone: '', contactName: '', contactPhone: '', email: '',
};

const FIELDS: Array<{ key: keyof FormDefaults; label: string; placeholder: string }> = [
  { key: 'organizationName', label: '마을명 / 단체명', placeholder: '예: 제주 대정읍 인성리' },
  { key: 'representativeName', label: '대표자', placeholder: '예: 홍길동' },
  { key: 'representativePhone', label: '대표자 연락처', placeholder: '예: 010-0000-0000' },
  { key: 'contactName', label: '담당자', placeholder: '예: 김사무장' },
  { key: 'contactPhone', label: '담당자 연락처', placeholder: '예: 010-0000-0000' },
  { key: 'email', label: '이메일', placeholder: '예: village@example.com' },
];

export default function FormDefaultsPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [defaults, setDefaults] = useState<FormDefaults>(EMPTY_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isFirebaseConfigured || !db) { setLoading(false); return; }
    getDoc(doc(db, 'villages', id)).then((snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.data();
      const savedDefaults = data.formDefaults as Partial<FormDefaults> | undefined;
      setDefaults({ ...EMPTY_DEFAULTS, ...savedDefaults, organizationName: savedDefaults?.organizationName || data.name || '' });
    }).catch(() => setError('기본값을 불러오지 못했습니다. Firebase 권한을 확인해주세요.')).finally(() => setLoading(false));
  }, [id]);

  const save = async () => {
    if (!db) return;
    setSaving(true);
    setError('');
    try {
      await updateDoc(doc(db, 'villages', id), { formDefaults: defaults, updatedAt: new Date() });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError('저장하지 못했습니다. 관리자 권한과 Firebase 연결을 확인해주세요.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardShell villageId={id}>
      <div className="max-w-2xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-500/10"><FilePenLine className="h-5 w-5 text-purple-500" /></div>
          <div><h1 className="text-xl font-bold">양식 기본값</h1><p className="mt-1 text-sm text-[var(--color-text-secondary)]">반복되는 신청자 정보를 한 번 등록하면 양식 변환에 자동 적용합니다.</p></div>
        </div>

        {loading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> : (
          <div className="space-y-4">
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-6">
              <div className="space-y-4">
                {FIELDS.map((field) => <label key={field.key} className="block"><span className="mb-1 block text-sm font-medium">{field.label}</span><input value={defaults[field.key]} onChange={(event) => setDefaults({ ...defaults, [field.key]: event.target.value })} placeholder={field.placeholder} className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm focus:border-primary focus:outline-none" /></label>)}
              </div>
            </div>
            {error && <div className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}
            <button onClick={save} disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-medium text-white disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <><Check className="h-4 w-4" />저장되었습니다</> : <><Save className="h-4 w-4" />기본값 저장</>}</button>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
