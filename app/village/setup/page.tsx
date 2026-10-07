'use client';

import {
  ArrowLeft,
  Check,
  ChevronRight,
  Home,
  LoaderCircle,
  MapPin,
  Plus,
  Search,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore';

import { useAuth, VillageRole } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { db } from '@/lib/firebase/client';

interface VillageResult {
  id: string;
  name: string;
  address: string;
  memberCount: number;
}

export default function VillageSetupPage() {
  const router = useRouter();
  const { user, loading, refreshProfile } = useAuth();
  const [term, setTerm] = useState('');
  const [address, setAddress] = useState('');
  const [role, setRole] = useState<VillageRole>('leader');
  const [results, setResults] = useState<VillageResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (term.trim().length < 2) return;

    const timer = window.setTimeout(async () => {
      setSearching(true);
      setMessage(null);
      try {
        const normalized = term.trim();
        const snapshot = await getDocs(
          query(
            collection(db, 'villages'),
            where('name', '>=', normalized),
            where('name', '<=', `${normalized}\uf8ff`),
            orderBy('name'),
            limit(8),
          ),
        );
        setResults(
          snapshot.docs.map((item) => ({
            id: item.id,
            name: String(item.data().name ?? ''),
            address: String(item.data().address ?? ''),
            memberCount: Number(item.data().memberCount ?? 0),
          })),
        );
      } catch (error) {
        setMessage(error instanceof Error ? error.message : '마을 검색에 실패했습니다.');
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [term]);

  async function joinVillage(village: VillageResult) {
    if (!user) return;
    setSaving(true);
    setMessage(null);
    try {
      const batch = writeBatch(db);
      batch.set(
        doc(db, 'villages', village.id, 'members', user.uid),
        {
          uid: user.uid,
          displayName: user.displayName ?? '마을 주민',
          email: user.email ?? '',
          role: 'member',
          status: 'active',
          joinedAt: serverTimestamp(),
        },
        { merge: true },
      );
      batch.set(doc(db, 'users', user.uid), { villageId: village.id, role: 'member' }, { merge: true });
      await batch.commit();
      await refreshProfile();
      router.replace(`/village/${village.id}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '마을 가입에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  async function createVillage() {
    if (!user || term.trim().length < 2 || !address.trim()) {
      setMessage('마을 이름과 주소를 입력해 주세요.');
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const villageRef = doc(collection(db, 'villages'));
      const batch = writeBatch(db);
      batch.set(villageRef, {
        name: term.trim(),
        address: address.trim(),
        regionCode: '',
        description: '',
        photoURL: '',
        bannerURL: '',
        population: null,
        specialties: [],
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        memberCount: 1,
        settings: { isPublic: true, requireApproval: true, inviteOnly: false },
      });
      batch.set(doc(db, 'villages', villageRef.id, 'members', user.uid), {
        uid: user.uid,
        displayName: user.displayName ?? '마을 관리자',
        email: user.email ?? '',
        role,
        status: 'active',
        joinedAt: serverTimestamp(),
      });
      batch.set(doc(db, 'users', user.uid), { villageId: villageRef.id, role }, { merge: true });
      await batch.commit();
      await refreshProfile();
      router.replace(`/village/${villageRef.id}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '마을 생성에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  if (loading || !user) {
    return <main className="grid min-h-screen place-items-center bg-background"><LoaderCircle className="size-7 animate-spin text-primary" /></main>;
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:py-14">
      <section className="mx-auto w-full max-w-2xl">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold"><span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground"><Home className="size-4.5" /></span>마을AI사무장</Link>
          <Link href="/" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> 돌아가기</Link>
        </div>

        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.13em] text-primary">VILLAGE SETUP</p>
          <h1 className="mt-2 text-3xl font-bold tracking-[-0.05em] sm:text-4xl">어느 마을과 함께하시나요?</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">등록된 마을에 가입하거나, 이장·사무장이라면 새 마을을 만들 수 있습니다.</p>
        </div>

        <Card className="border-0 shadow-[0_16px_60px_rgba(23,63,50,0.1)] ring-border">
          <CardContent className="p-5 sm:p-7">
            <label htmlFor="village-name" className="text-sm font-semibold">마을 이름</label>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="village-name" value={term} onChange={(event) => { const next = event.target.value; setTerm(next); if (next.trim().length < 2) setResults([]); }} className="h-12 rounded-xl pl-10" placeholder="예: 금성리, 다랭이마을" autoComplete="off" />
              {searching && <LoaderCircle className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-primary" />}
            </div>

            {results.length > 0 && (
              <div className="mt-3 overflow-hidden rounded-xl border">
                {results.map((village) => (
                  <button key={village.id} type="button" disabled={saving} onClick={() => joinVillage(village)} className="flex w-full items-center gap-3 border-b p-4 text-left last:border-b-0 hover:bg-accent disabled:opacity-50">
                    <span className="grid size-10 place-items-center rounded-xl bg-secondary text-primary"><MapPin className="size-4.5" /></span>
                    <span className="min-w-0 flex-1"><strong className="block text-sm">{village.name}</strong><span className="mt-1 block truncate text-xs text-muted-foreground">{village.address} · 주민 {village.memberCount}명</span></span>
                    <span className="flex items-center gap-1 text-xs font-semibold text-primary">가입 <ChevronRight className="size-3.5" /></span>
                  </button>
                ))}
              </div>
            )}

            <div className="my-7 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />등록된 마을이 없다면<span className="h-px flex-1 bg-border" /></div>

            <div className="space-y-5">
              <div>
                <label htmlFor="village-address" className="text-sm font-semibold">마을 주소</label>
                <Input id="village-address" value={address} onChange={(event) => setAddress(event.target.value)} className="mt-2 h-12 rounded-xl" placeholder="시·군·구·읍·면·리까지 입력" />
              </div>
              <fieldset>
                <legend className="text-sm font-semibold">내 역할</legend>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  {[
                    { value: 'leader' as VillageRole, label: '이장', icon: Users },
                    { value: 'secretary' as VillageRole, label: '사무장', icon: Check },
                  ].map((item) => {
                    const Icon = item.icon;
                    return <button key={item.value} type="button" onClick={() => setRole(item.value)} className={`flex h-12 items-center justify-center gap-2 rounded-xl border text-sm font-semibold ${role === item.value ? 'border-primary bg-secondary text-primary' : 'hover:bg-accent'}`}><Icon className="size-4" />{item.label}</button>;
                  })}
                </div>
              </fieldset>
              <Button className="h-12 w-full rounded-xl" onClick={createVillage} disabled={saving || term.trim().length < 2}>
                {saving ? <LoaderCircle className="animate-spin" /> : <Plus />} 새 마을 만들기
              </Button>
            </div>

            {message && <p role="alert" className="mt-5 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{message}</p>}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
