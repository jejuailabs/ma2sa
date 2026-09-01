'use client';

import { useEffect, useState } from 'react';
import { Settings, Loader2, Save, MapPin, Phone, Globe } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { isFirebaseConfigured, db } from '@/lib/firebase/config';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';

interface VillageSettings {
  name: string;
  address: string;
  phone: string;
  description: string;
  isPublic: boolean;
}

export default function SettingsPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { user } = useAuth();
  const [settings, setSettings] = useState<VillageSettings>({ name: '', address: '', phone: '', description: '', isPublic: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured || !db) { setLoading(false); return; }
    getDoc(doc(db, 'villages', id))
      .then((snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setSettings({
            name: data.name ?? '',
            address: data.address ?? '',
            phone: data.phone ?? '',
            description: data.description ?? '',
            isPublic: data.isPublic !== false,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const save = async () => {
    if (!db) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'villages', id), {
        name: settings.name,
        address: settings.address,
        phone: settings.phone,
        description: settings.description,
        isPublic: settings.isPublic,
        updatedAt: new Date(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {} finally { setSaving(false); }
  };

  return (
    <DashboardShell villageId={id}>
      <div className="max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-500/10 flex items-center justify-center">
            <Settings className="w-5 h-5 text-gray-600" />
          </div>
          <h1 className="text-xl font-bold">마을 설정</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-4">
            <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-6">
              <h3 className="font-bold mb-4">기본 정보</h3>
              <div className="space-y-4">
                <label className="block">
                  <span className="text-sm font-medium mb-1 block">마을 이름</span>
                  <input value={settings.name} onChange={(e) => setSettings({ ...settings, name: e.target.value })} className="w-full px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:border-primary" />
                </label>
                <label className="block">
                  <span className="text-sm font-medium mb-1 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />주소</span>
                  <input value={settings.address} onChange={(e) => setSettings({ ...settings, address: e.target.value })} placeholder="마을 주소" className="w-full px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:border-primary" />
                </label>
                <label className="block">
                  <span className="text-sm font-medium mb-1 flex items-center gap-1"><Phone className="w-3.5 h-3.5" />연락처</span>
                  <input value={settings.phone} onChange={(e) => setSettings({ ...settings, phone: e.target.value })} placeholder="이장/사무장 연락처" className="w-full px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:border-primary" />
                </label>
                <label className="block">
                  <span className="text-sm font-medium mb-1 block">마을 소개</span>
                  <textarea value={settings.description} onChange={(e) => setSettings({ ...settings, description: e.target.value })} rows={3} placeholder="마을을 소개하는 한 줄" className="w-full px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-sm resize-none focus:outline-none focus:border-primary" />
                </label>
              </div>
            </div>

            <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-6">
              <h3 className="font-bold mb-4">공개 설정</h3>
              <label className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium flex items-center gap-1"><Globe className="w-3.5 h-3.5" />마을 피드 공개</p>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">비로그인 사용자에게도 마을 소식을 공개합니다</p>
                </div>
                <button onClick={() => setSettings({ ...settings, isPublic: !settings.isPublic })} className={`w-12 h-6 rounded-full transition-colors ${settings.isPublic ? 'bg-primary' : 'bg-gray-300'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.isPublic ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </label>
            </div>

            <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-6">
              <h3 className="font-bold mb-2">관리자 정보</h3>
              <p className="text-sm text-[var(--color-text-secondary)]">{user?.displayName || '관리자'} ({user?.email})</p>
            </div>

            <button onClick={save} disabled={saving} className="w-full py-3 rounded-xl bg-primary text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <><Save className="w-4 h-4" /> 저장되었습니다</> : <><Save className="w-4 h-4" /> 저장</>}
            </button>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
