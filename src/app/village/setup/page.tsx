'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Loader2, MapPin, Plus, Search, UserCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { createVillage, joinVillage, searchVillages, putUserProfile } from '@/lib/firebase/firestore';
import { isFirebaseConfigured } from '@/lib/firebase/config';
import type { Village } from '@/types/village';
import { OFFICIAL_ROLES, type UserRole } from '@/types/user';

interface PlaceResult {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

type Step = 'role' | 'search' | 'create';

export default function VillageSetupPage() {
  const { firebaseUser, user, loading, refreshProfile } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<Step>('role');
  const [isOfficial, setIsOfficial] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>('leader');
  const [queryText, setQueryText] = useState('');
  const [placeResults, setPlaceResults] = useState<PlaceResult[]>([]);
  const [existingVillages, setExistingVillages] = useState<Village[]>([]);
  const [searching, setSearching] = useState(false);
  const [form, setForm] = useState({ name: '', address: '', description: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!loading && !firebaseUser) router.replace('/login');
  }, [firebaseUser, loading, router]);

  useEffect(() => {
    if (queryText.trim().length < 2) { setPlaceResults([]); setExistingVillages([]); return; }
    const timer = window.setTimeout(async () => {
      setSearching(true);
      const [placesRes, firestoreRes] = await Promise.all([
        fetch(`/api/villages/search?q=${encodeURIComponent(queryText)}`)
          .then((r) => r.json())
          .then((d) => (d.results ?? []) as PlaceResult[])
          .catch(() => [] as PlaceResult[]),
        isFirebaseConfigured
          ? searchVillages(queryText).catch(() => [] as Village[])
          : Promise.resolve([] as Village[]),
      ]);
      setPlaceResults(placesRes);
      setExistingVillages(firestoreRes);
      setSearching(false);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [queryText]);

  const proceedToVillage = () => {
    setStep('search');
  };

  const selectPlace = async (place: PlaceResult) => {
    if (!firebaseUser) return;
    setBusy(true); setError('');
    try {
      const role = isOfficial ? selectedRole : 'member';
      const villageId = await createVillage({
        name: place.name, address: place.address, regionCode: '', description: '',
        photoURL: '', bannerURL: '', population: null, specialties: [], createdBy: firebaseUser.uid,
        settings: { isPublic: true, requireApproval: true, inviteOnly: false },
      }, firebaseUser.uid);
      if (isOfficial && isFirebaseConfigured) {
        await putUserProfile(firebaseUser.uid, { role });
      }
      await refreshProfile();
      router.push(isOfficial ? `/village/${villageId}` : `/village/${villageId}/feed`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : '마을을 등록하지 못했습니다.'); }
    finally { setBusy(false); }
  };

  const selectVillage = async (village: Village) => {
    if (!firebaseUser) return;
    setBusy(true); setError('');
    try {
      const role = isOfficial ? selectedRole : 'member';
      const status = await joinVillage(village.id, firebaseUser.uid);
      if (isOfficial && isFirebaseConfigured) {
        await putUserProfile(firebaseUser.uid, { role });
      }
      if (status === 'pending') { setNotice('가입 요청을 보냈습니다. 관리자 승인 후 이용할 수 있습니다.'); return; }
      await refreshProfile();
      if (isOfficial) {
        router.push(`/village/${village.id}`);
      } else {
        router.push(`/village/${village.id}/feed`);
      }
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
      if (isOfficial && isFirebaseConfigured) {
        await putUserProfile(firebaseUser.uid, { role: selectedRole });
      }
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
          <h1 className="text-2xl font-bold mb-2">
            {step === 'role' ? '마을 가입 설정' : step === 'search' ? '마을 지정하기' : '새 마을 만들기'}
          </h1>
          <p className="text-[var(--color-text-secondary)]">
            {step === 'role' ? '마을에서의 역할을 선택해주세요' : step === 'search' ? '소속 마을을 검색하거나 새로운 마을을 등록하세요' : '마을 정보를 입력해주세요'}
          </p>
        </div>

        {!isFirebaseConfigured && <div className="mb-4 p-4 rounded-xl bg-yellow-50 text-yellow-800 text-sm">Firebase 환경 변수를 설정해야 마을을 저장할 수 있습니다.</div>}
        {error && <div className="mb-4 p-4 rounded-xl bg-red-50 text-error text-sm">{error}</div>}
        {notice && <div className="mb-4 p-4 rounded-xl bg-secondary-light text-secondary text-sm">{notice}</div>}

        {step === 'role' && (
          <div className="space-y-5">
            {/* 마을 관계자 체크 */}
            <button
              onClick={() => setIsOfficial(!isOfficial)}
              className={`w-full flex items-center gap-4 p-5 rounded-xl border-2 transition-all ${
                isOfficial
                  ? 'border-primary bg-primary-light'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-primary/50'
              }`}
            >
              <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
                isOfficial ? 'border-primary bg-primary' : 'border-[var(--color-border)]'
              }`}>
                {isOfficial && <UserCheck className="w-4 h-4 text-white" />}
              </div>
              <div className="text-left flex-1">
                <p className="font-semibold text-[var(--color-text)]">마을 관계자입니다</p>
                <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">이장, 사무장, 부녀회장 등 마을 운영에 참여하시는 분</p>
              </div>
            </button>

            {/* 직책 선택 (관계자일 때만) */}
            {isOfficial && (
              <div className="space-y-2 animate-fadeIn">
                <p className="text-sm font-medium text-[var(--color-text)] px-1">직책을 선택해주세요</p>
                <div className="grid grid-cols-2 gap-2">
                  {OFFICIAL_ROLES.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setSelectedRole(value)}
                      className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                        selectedRole === value
                          ? 'bg-primary text-white shadow-md'
                          : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] hover:border-primary'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!isOfficial && (
              <p className="text-center text-sm text-[var(--color-text-secondary)] py-2">
                일반 회원으로 마을 소식을 확인하고 참여할 수 있습니다
              </p>
            )}

            <button
              onClick={proceedToVillage}
              className="w-full py-3.5 rounded-xl bg-primary text-white font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
            >
              다음 <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {step === 'search' && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-secondary)]" />
              <input value={queryText} onChange={(e) => setQueryText(e.target.value)} placeholder="마을 이름을 입력하세요 (예: 조천리, 금성리)" className="w-full pl-12 pr-4 py-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl focus:outline-none focus:border-primary" autoFocus />
            </div>
            {queryText.length >= 2 && (
              <div className="border border-[var(--color-border)] rounded-xl overflow-hidden">
                {searching && (
                  <div className="flex items-center justify-center gap-2 px-4 py-4 text-sm text-[var(--color-text-secondary)]">
                    <Loader2 className="w-4 h-4 animate-spin" /> 검색 중...
                  </div>
                )}

                {/* 기존 등록된 마을 */}
                {existingVillages.length > 0 && (
                  <>
                    <div className="px-4 py-2 bg-primary-light text-xs font-semibold text-primary">이미 등록된 마을</div>
                    {existingVillages.map((village) => (
                      <button key={village.id} disabled={busy} onClick={() => selectVillage(village)} className="w-full flex items-center gap-3 px-4 py-3 text-left border-b border-[var(--color-border)] hover:bg-[var(--color-surface)] disabled:opacity-50">
                        <MapPin className="w-5 h-5 text-primary" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{village.name}</p>
                          <p className="text-xs text-[var(--color-text-secondary)]">{village.address}</p>
                        </div>
                        <span className="text-xs text-white bg-primary px-2 py-0.5 rounded-full font-medium">가입</span>
                      </button>
                    ))}
                  </>
                )}

                {/* Google Places 검색 결과 */}
                {placeResults.length > 0 && (
                  <>
                    <div className="px-4 py-2 bg-[var(--color-surface)] text-xs font-semibold text-[var(--color-text-secondary)]">검색 결과</div>
                    {placeResults.map((place) => (
                      <button key={place.id} disabled={busy} onClick={() => selectPlace(place)} className="w-full flex items-center gap-3 px-4 py-3 text-left border-b border-[var(--color-border)] hover:bg-[var(--color-surface)] disabled:opacity-50">
                        <MapPin className="w-5 h-5 text-[var(--color-text-secondary)]" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{place.name}</p>
                          <p className="text-xs text-[var(--color-text-secondary)]">{place.address}</p>
                        </div>
                        <span className="text-xs text-secondary font-medium">등록</span>
                      </button>
                    ))}
                  </>
                )}

                {!searching && placeResults.length === 0 && existingVillages.length === 0 && (
                  <div className="px-4 py-4 text-sm text-center text-[var(--color-text-secondary)]">
                    검색 결과가 없습니다
                  </div>
                )}

                <button onClick={() => { setForm((v) => ({ ...v, name: queryText })); setStep('create'); }} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--color-surface)]">
                  <Plus className="w-5 h-5 text-secondary" /><span className="text-sm text-secondary font-medium">직접 입력하여 새 마을 만들기</span>
                </button>
              </div>
            )}
            <button onClick={() => setStep('role')} className="w-full py-3 rounded-xl border border-[var(--color-border)] flex items-center justify-center gap-2 text-sm">
              <ArrowLeft className="w-4 h-4" /> 이전
            </button>
          </div>
        )}

        {step === 'create' && (
          <div className="space-y-5">
            {isOfficial && (
              <p className="p-4 bg-secondary-light dark:bg-secondary/10 rounded-xl text-sm text-secondary">
                최초 등록자는 {OFFICIAL_ROLES.find((r) => r.value === selectedRole)?.label ?? '관계자'} 권한으로 등록됩니다.
              </p>
            )}
            {([['name', '마을 이름', '금성리 마을'], ['address', '주소', '시·군·구·읍·면·리']] as const).map(([key, label, placeholder]) => (
              <label key={key} className="block text-sm font-medium">
                {label}
                <input value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} placeholder={placeholder} className="mt-1.5 w-full px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl focus:outline-none focus:border-primary" />
              </label>
            ))}
            <label className="block text-sm font-medium">
              마을 소개 (선택)
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} className="mt-1.5 w-full px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl resize-none focus:outline-none focus:border-primary" />
            </label>
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
