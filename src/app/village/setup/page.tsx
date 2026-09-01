'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Loader2, MapPin, Plus, Search } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { createVillage, joinVillage, searchVillages } from '@/lib/firebase/firestore';
import { isFirebaseConfigured } from '@/lib/firebase/config';
import type { Village } from '@/types/village';

export default function VillageSetupPage() {
  const { firebaseUser, user, loading, refreshProfile } = useAuth();
  const router = useRouter();
  const [queryText, setQueryText] = useState('');
  const [results, setResults] = useState<Village[]>([]);
  const [step, setStep] = useState<'search' | 'create'>('search');
  const [form, setForm] = useState({ name: '', address: '', description: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!loading && !firebaseUser) router.replace('/login');
  }, [firebaseUser, loading, router]);

  useEffect(() => {
    if (queryText.trim().length < 2 || !isFirebaseConfigured) { setResults([]); return; }
    const timer = window.setTimeout(async () => {
      try { setResults(await searchVillages(queryText)); }
      catch { setError('마을 검색 중 오류가 발생했습니다.'); }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [queryText]);

  const selectVillage = async (village: Village) => {
    if (!firebaseUser) return;
    setBusy(true); setError('');
    try {
      const status = await joinVillage(village.id, firebaseUser.uid);
      if (status === 'pending') { setNotice('가입 요청을 보냈습니다. 관리자 승인 후 이용할 수 있습니다.'); return; }
      await refreshProfile();
      router.push(`/village/${village.id}/feed`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : '가입하지 못했습니다.'); }
    finally { setBusy(false); }
  };

  const submitCreate = async () => {
    if (!firebaseUser || !form.name.trim() || !form.address.trim()) { setError('마을 이름과 주소를 입력해주세요.'); return; }
    setBusy(true); setError('');
    try {
      const villageId = await createVillage({
        name: form.name.trim(), address: form.address.trim(), regionCode: '', description: form.description.trim(),
        photoURL: '', bannerURL: '', population: null, specialties: [], createdBy: firebaseUser.uid,
        settings: { isPublic: true, requireApproval: true, inviteOnly: false },
      }, firebaseUser.uid);
      await refreshProfile();
      router.push(`/village/${villageId}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : '마을을 만들지 못했습니다.'); }
    finally { setBusy(false); }
  };

  if (loading || !firebaseUser) return <div className="min-h-screen grid place-items-center"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">마을 지정하기</h1>
          <p className="text-[var(--color-text-secondary)]">소속 마을을 검색하거나 새로운 마을을 등록하세요</p>
        </div>
        {!isFirebaseConfigured && <div className="mb-4 p-4 rounded-xl bg-yellow-50 text-yellow-800 text-sm">Firebase 환경 변수를 설정해야 마을을 저장할 수 있습니다.</div>}
        {error && <div className="mb-4 p-4 rounded-xl bg-red-50 text-error text-sm">{error}</div>}
        {notice && <div className="mb-4 p-4 rounded-xl bg-secondary-light text-secondary text-sm">{notice}</div>}

        {step === 'search' ? (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-secondary)]" />
              <input value={queryText} onChange={(event) => setQueryText(event.target.value)} placeholder="마을 이름을 입력하세요" className="w-full pl-12 pr-4 py-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl focus:outline-none focus:border-primary" autoFocus />
            </div>
            {queryText.length >= 2 && (
              <div className="border border-[var(--color-border)] rounded-xl overflow-hidden">
                {results.map((village) => (
                  <button key={village.id} disabled={busy} onClick={() => selectVillage(village)} className="w-full flex items-center gap-3 px-4 py-3 text-left border-b border-[var(--color-border)] hover:bg-[var(--color-surface)] disabled:opacity-50">
                    <MapPin className="w-5 h-5 text-primary" /><div className="flex-1"><p className="text-sm font-medium">{village.name}</p><p className="text-xs text-[var(--color-text-secondary)]">{village.address}</p></div><span className="text-xs text-primary font-medium">가입</span>
                  </button>
                ))}
                <button onClick={() => { setForm((value) => ({ ...value, name: queryText })); setStep('create'); }} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--color-surface)]">
                  <Plus className="w-5 h-5 text-secondary" /><span className="text-sm text-secondary font-medium">“{queryText}”으로 새 마을 만들기</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            <p className="p-4 bg-secondary-light dark:bg-secondary/10 rounded-xl text-sm text-secondary">최초 등록자는 이장 권한으로 등록됩니다. 다른 관리자는 생성 후 초대할 수 있습니다.</p>
            {([['name', '마을 이름', '금성리 마을'], ['address', '주소', '시·군·구·읍·면·리']] as const).map(([key, label, placeholder]) => <label key={key} className="block text-sm font-medium">{label}<input value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} placeholder={placeholder} className="mt-1.5 w-full px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl focus:outline-none focus:border-primary" /></label>)}
            <label className="block text-sm font-medium">마을 소개 (선택)<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={4} className="mt-1.5 w-full px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl resize-none focus:outline-none focus:border-primary" /></label>
            <div className="flex gap-3">
              <button onClick={() => setStep('search')} className="flex-1 py-3 rounded-xl border border-[var(--color-border)] flex items-center justify-center gap-2"><ArrowLeft className="w-4 h-4" />뒤로</button>
              <button onClick={submitCreate} disabled={busy || !isFirebaseConfigured} className="flex-1 py-3 rounded-xl bg-primary text-white flex items-center justify-center gap-2 disabled:opacity-50">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <>마을 만들기<ArrowRight className="w-4 h-4" /></>}</button>
            </div>
          </div>
        )}
        {user?.villageId && <button onClick={() => router.push(`/village/${user.villageId}/feed`)} className="mt-6 w-full text-sm text-[var(--color-text-secondary)]">기존 마을로 돌아가기</button>}
      </div>
    </div>
  );
}
