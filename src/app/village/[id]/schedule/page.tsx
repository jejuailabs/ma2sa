'use client';

import { useEffect, useState } from 'react';
import { Calendar, Plus, Loader2, Trash2, Clock, MapPin } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { isFirebaseConfigured, db } from '@/lib/firebase/config';
import { collection, query, orderBy, getDocs, addDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';

interface ScheduleEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  location?: string;
  description?: string;
  type: 'meeting' | 'event' | 'deadline' | 'other';
}

const TYPE_COLORS: Record<string, { dot: string; bg: string; label: string }> = {
  meeting: { dot: 'bg-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10', label: '회의' },
  event: { dot: 'bg-green-500', bg: 'bg-green-50 dark:bg-green-500/10', label: '행사' },
  deadline: { dot: 'bg-red-500', bg: 'bg-red-50 dark:bg-red-500/10', label: '마감' },
  other: { dot: 'bg-gray-400', bg: 'bg-gray-50 dark:bg-gray-500/10', label: '기타' },
};

export default function SchedulePage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<{ title: string; date: string; time: string; location: string; description: string; type: ScheduleEvent['type'] }>({ title: '', date: '', time: '', location: '', description: '', type: 'event' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured || !db) { setLoading(false); return; }
    getDocs(query(collection(db, 'villages', id, 'schedule'), orderBy('date', 'asc')))
      .then((snap) => {
        setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ScheduleEvent)));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const addEvent = async () => {
    if (!form.title.trim() || !form.date || !db) return;
    setSaving(true);
    try {
      const docRef = await addDoc(collection(db, 'villages', id, 'schedule'), {
        ...form,
        createdAt: Timestamp.now(),
      });
      setEvents((prev) => [...prev, { id: docRef.id, ...form }].sort((a, b) => a.date.localeCompare(b.date)));
      setForm({ title: '', date: '', time: '', location: '', description: '', type: 'event' });
      setShowForm(false);
    } catch {} finally { setSaving(false); }
  };

  const deleteEvent = async (eventId: string) => {
    if (!db || !confirm('이 일정을 삭제하시겠습니까?')) return;
    try {
      await deleteDoc(doc(db, 'villages', id, 'schedule', eventId));
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
    } catch {}
  };

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = events.filter((e) => e.date >= today);
  const past = events.filter((e) => e.date < today);

  return (
    <DashboardShell villageId={id}>
      <div className="max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-orange-500" />
            </div>
            <h1 className="text-xl font-bold">일정 관리</h1>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90">
            <Plus className="w-4 h-4" /> 일정 추가
          </button>
        </div>

        {showForm && (
          <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-6 mb-4">
            <h3 className="font-bold mb-4">새 일정</h3>
            <div className="grid sm:grid-cols-2 gap-3 mb-3">
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="일정 제목" className="px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:border-primary" />
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:border-primary" />
              <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className="px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:border-primary" />
              <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="장소" className="px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:border-primary" />
            </div>
            <div className="flex gap-2 mb-3">
              {Object.entries(TYPE_COLORS).map(([key, cfg]) => (
                <button key={key} onClick={() => setForm({ ...form, type: key as ScheduleEvent['type'] })} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${form.type === key ? 'bg-primary text-white' : 'bg-[var(--color-surface)] border border-[var(--color-border)]'}`}>
                  {cfg.label}
                </button>
              ))}
            </div>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="메모 (선택)" rows={2} className="w-full px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-sm resize-none focus:outline-none focus:border-primary mb-3" />
            <div className="flex gap-2">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-lg border border-[var(--color-border)] text-sm">취소</button>
              <button onClick={addEvent} disabled={saving || !form.title.trim() || !form.date} className="flex-1 py-2 rounded-lg bg-primary text-white text-sm font-medium disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : '추가'}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : events.length === 0 ? (
          <div className="text-center py-16">
            <Calendar className="w-12 h-12 text-[var(--color-text-secondary)] mx-auto mb-3" />
            <p className="text-[var(--color-text-secondary)]">등록된 일정이 없습니다</p>
            <p className="text-xs text-[var(--color-text-secondary)] mt-1">위의 "일정 추가" 버튼으로 새 일정을 등록하세요</p>
          </div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-3">다가오는 일정 ({upcoming.length})</h3>
                <div className="space-y-2">
                  {upcoming.map((e) => {
                    const cfg = TYPE_COLORS[e.type] || TYPE_COLORS.other;
                    const d = new Date(e.date);
                    const dDay = Math.ceil((d.getTime() - Date.now()) / 86400000);
                    return (
                      <div key={e.id} className="flex items-start gap-4 p-4 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl group">
                        <div className="text-center shrink-0 w-12">
                          <p className="text-xs text-[var(--color-text-secondary)]">{d.toLocaleDateString('ko-KR', { month: 'short' })}</p>
                          <p className="text-lg font-bold">{d.getDate()}</p>
                          <p className="text-[10px] text-[var(--color-text-secondary)]">{d.toLocaleDateString('ko-KR', { weekday: 'short' })}</p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                            <p className="text-sm font-medium">{e.title}</p>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] ${cfg.bg}`}>{cfg.label}</span>
                            {dDay >= 0 && <span className="text-xs text-primary font-medium">D{dDay === 0 ? '-Day' : `-${dDay}`}</span>}
                          </div>
                          <div className="flex gap-3 mt-1">
                            {e.time && <span className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)]"><Clock className="w-3 h-3" />{e.time}</span>}
                            {e.location && <span className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)]"><MapPin className="w-3 h-3" />{e.location}</span>}
                          </div>
                          {e.description && <p className="text-xs text-[var(--color-text-secondary)] mt-1">{e.description}</p>}
                        </div>
                        <button onClick={() => deleteEvent(e.id)} className="p-1.5 rounded-lg text-[var(--color-text-secondary)] hover:text-error opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {past.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-3">지난 일정 ({past.length})</h3>
                <div className="space-y-2 opacity-60">
                  {past.map((e) => {
                    const cfg = TYPE_COLORS[e.type] || TYPE_COLORS.other;
                    return (
                      <div key={e.id} className="flex items-center gap-4 p-3 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl group">
                        <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                        <p className="text-sm flex-1">{e.title}</p>
                        <span className="text-xs text-[var(--color-text-secondary)]">{e.date}</span>
                        <button onClick={() => deleteEvent(e.id)} className="p-1.5 rounded-lg text-[var(--color-text-secondary)] hover:text-error opacity-0 group-hover:opacity-100">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardShell>
  );
}
