'use client';

import { useEffect, useState } from 'react';
import { Users, Search, Loader2, Shield, UserCheck, UserX, Mail } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { isFirebaseConfigured, db } from '@/lib/firebase/config';
import { collection, query, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';

interface Member {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  role: 'admin' | 'member' | 'pending';
  joinedAt: Date;
}

const ROLE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  admin: { label: '이장/사무장', color: 'text-primary', bg: 'bg-primary-light' },
  leader: { label: '이장/사무장', color: 'text-primary', bg: 'bg-primary-light' },
  secretary: { label: '사무장', color: 'text-primary', bg: 'bg-primary-light' },
  member: { label: '주민', color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-500/10' },
  pending: { label: '승인 대기', color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-500/10' },
};

export default function MembersPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [filter, setFilter] = useState<'all' | 'admin' | 'member' | 'pending'>('all');

  useEffect(() => {
    if (!isFirebaseConfigured || !db) { setLoading(false); return; }
    getDocs(query(collection(db, 'villages', id, 'members')))
      .then(async (snap) => {
        const memberList: Member[] = [];
        for (const d of snap.docs) {
          const data = d.data();
          let displayName = data.displayName || '';
          let email = data.email || '';
          let photoURL = data.photoURL || '';

          if (!displayName || !email) {
            try {
              const userDoc = await getDoc(doc(db!, 'users', d.id));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                if (!displayName) displayName = userData.displayName || userData.name || '';
                if (!email) email = userData.email || '';
                if (!photoURL) photoURL = userData.photoURL || '';
              }
            } catch {}
          }

          memberList.push({
            uid: d.id,
            displayName: displayName || '이름 없음',
            email,
            photoURL: photoURL || undefined,
            role: data.role ?? 'member',
            joinedAt: data.joinedAt?.toDate?.() ?? new Date(),
          });
        }
        setMembers(memberList);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const updateRole = async (uid: string, role: 'admin' | 'member') => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'villages', id, 'members', uid), { role });
      setMembers((prev) => prev.map((m) => m.uid === uid ? { ...m, role } : m));
    } catch {}
  };

  const approveMember = async (uid: string) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'villages', id, 'members', uid), { role: 'member' });
      setMembers((prev) => prev.map((m) => m.uid === uid ? { ...m, role: 'member' } : m));
    } catch {}
  };

  const filtered = members
    .filter((m) => {
      if (filter === 'all') return true;
      if (filter === 'admin') return ['admin', 'leader', 'secretary'].includes(m.role);
      return m.role === filter;
    })
    .filter((m) => !searchText || m.displayName.includes(searchText) || m.email.includes(searchText));

  const pendingCount = members.filter((m) => m.role === 'pending').length;

  return (
    <DashboardShell villageId={id}>
      <div className="max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-50 dark:bg-green-500/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold">마을 주민</h1>
              <p className="text-xs text-[var(--color-text-secondary)]">{members.length}명</p>
            </div>
          </div>
          {pendingCount > 0 && (
            <span className="px-3 py-1 rounded-full bg-orange-50 text-orange-500 text-xs font-medium">
              승인 대기 {pendingCount}명
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {([['all', '전체'], ['admin', '이장/사무장'], ['member', '주민'], ['pending', '승인 대기']] as const).map(([val, label]) => (
            <button key={val} onClick={() => setFilter(val)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filter === val ? 'bg-primary text-white' : 'bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-primary'}`}>
              {label}
            </button>
          ))}
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)]" />
          <input value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="이름 또는 이메일로 검색..." className="w-full pl-10 pr-4 py-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl text-sm focus:outline-none focus:border-primary" />
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-12 h-12 text-[var(--color-text-secondary)] mx-auto mb-3" />
            <p className="text-[var(--color-text-secondary)]">
              {members.length === 0 ? '아직 등록된 주민이 없습니다' : '검색 결과가 없습니다'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((m) => {
              const roleCfg = ROLE_LABELS[m.role] || ROLE_LABELS.member;
              return (
                <div key={m.uid} className="flex items-center gap-4 p-4 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl">
                  {m.photoURL ? (
                    <img src={m.photoURL} alt="" className="w-10 h-10 rounded-full" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center">
                      <span className="text-primary font-bold text-sm">{m.displayName[0]}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{m.displayName}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${roleCfg.color} ${roleCfg.bg}`}>{roleCfg.label}</span>
                    </div>
                    {m.email && (
                      <div className="flex items-center gap-2 mt-0.5">
                        <Mail className="w-3 h-3 text-[var(--color-text-secondary)]" />
                        <span className="text-xs text-[var(--color-text-secondary)] truncate">{m.email}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {m.role === 'pending' && (
                      <>
                        <button onClick={() => approveMember(m.uid)} className="p-2 rounded-lg text-green-600 hover:bg-green-50" title="승인">
                          <UserCheck className="w-4 h-4" />
                        </button>
                        <button className="p-2 rounded-lg text-error hover:bg-error/10" title="거절">
                          <UserX className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {m.role === 'member' && (
                      <button onClick={() => updateRole(m.uid, 'admin')} className="p-2 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]" title="관리자 지정">
                        <Shield className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
