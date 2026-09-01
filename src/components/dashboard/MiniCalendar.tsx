'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Plus, Loader2 } from 'lucide-react';
import { isFirebaseConfigured, db } from '@/lib/firebase/config';
import { addDoc, collection, onSnapshot, query, Timestamp } from 'firebase/firestore';

interface CalendarEvent { id: string; title: string; date: string; type: string; time?: string }

const TYPE_DOT: Record<string, string> = { meeting: 'bg-blue-500', event: 'bg-green-500', deadline: 'bg-red-500', other: 'bg-gray-400' };

export function MiniCalendar({ villageId }: { villageId: string }) {
  const today = new Date();
  const todayStr = toDateString(today);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [newTitle, setNewTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isFirebaseConfigured || !db) return;
    return onSnapshot(query(collection(db, 'villages', villageId, 'schedule')), (snap) => {
      setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() } as CalendarEvent)));
    }, () => setError('일정을 불러오지 못했습니다.'));
  }, [villageId]);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(year - 1); } else setMonth(month - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(year + 1); } else setMonth(month + 1); };
  const getDateStr = (day: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const eventsForDate = (date: string) => events.filter((event) => event.date === date);
  const selectedEvents = eventsForDate(selectedDate);
  const firstDay = new Date(year, month, 1).getDay();
  const days = [...Array(firstDay).fill(null), ...Array.from({ length: new Date(year, month + 1, 0).getDate() }, (_, index) => index + 1)];
  const selectedLabel = new Date(`${selectedDate}T00:00:00`).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });

  const addSchedule = async () => {
    if (!newTitle.trim() || !db) return;
    setSaving(true); setError('');
    try {
      await addDoc(collection(db, 'villages', villageId, 'schedule'), { title: newTitle.trim(), date: selectedDate, time: '', location: '', description: '', type: 'other', createdAt: Timestamp.now() });
      setNewTitle('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '일정을 저장하지 못했습니다.');
    } finally { setSaving(false); }
  };

  return (
    <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-[var(--color-text)]">일정</h3><Link href={`/village/${villageId}/schedule`} className="text-xs text-primary font-medium">관리 &rsaquo;</Link></div>
      <div className="flex items-center justify-between mb-3"><button onClick={prevMonth} className="p-1 rounded hover:bg-[var(--color-surface)]" aria-label="이전 달"><ChevronLeft className="w-4 h-4" /></button><span className="text-sm font-bold">{year}년 {month + 1}월</span><button onClick={nextMonth} className="p-1 rounded hover:bg-[var(--color-surface)]" aria-label="다음 달"><ChevronRight className="w-4 h-4" /></button></div>
      <div className="grid grid-cols-7 text-center mb-1">{['일', '월', '화', '수', '목', '금', '토'].map((name, index) => <div key={name} className={`text-[10px] font-medium py-1 ${index === 0 ? 'text-red-400' : index === 6 ? 'text-blue-400' : 'text-[var(--color-text-secondary)]'}`}>{name}</div>)}</div>
      <div className="grid grid-cols-7">
        {days.map((day, index) => {
          if (day === null) return <div key={`empty-${index}`} />;
          const date = getDateStr(day); const isToday = date === todayStr; const isSelected = date === selectedDate; const dateEvents = eventsForDate(date); const dayOfWeek = new Date(year, month, day).getDay();
          return <button key={date} onClick={() => setSelectedDate(date)} className={`relative flex flex-col items-center py-1.5 rounded-lg text-xs transition-colors ${isToday ? 'bg-primary text-white font-bold' : ''} ${isSelected && !isToday ? 'bg-primary-light ring-1 ring-primary' : ''} ${dateEvents.length > 0 && !isToday && !isSelected ? 'bg-green-50 text-green-700 font-bold' : ''} ${!isToday && !isSelected && !dateEvents.length ? 'hover:bg-[var(--color-surface)]' : ''} ${dayOfWeek === 0 && !isToday ? 'text-red-400' : ''} ${dayOfWeek === 6 && !isToday ? 'text-blue-400' : ''}`}>
            {day}{dateEvents.length > 0 && <span className={`mt-0.5 h-1 w-1 rounded-full ${isToday ? 'bg-white' : TYPE_DOT[dateEvents[0].type] || TYPE_DOT.other}`} />}
          </button>;
        })}
      </div>
      <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
        <p className="mb-2 text-xs font-bold text-[var(--color-text)]">{selectedLabel} 일정</p>
        {selectedEvents.length > 0 ? <div className="mb-3 space-y-1.5">{selectedEvents.map((event) => <div key={event.id} className="flex items-center gap-2 text-xs"><span className={`h-2 w-2 rounded-full ${TYPE_DOT[event.type] || TYPE_DOT.other}`} /><span className="truncate">{event.title}</span>{event.time && <span className="ml-auto text-[10px] text-[var(--color-text-secondary)]">{event.time}</span>}</div>)}</div> : <p className="mb-3 text-xs text-[var(--color-text-secondary)]">등록된 일정이 없습니다.</p>}
        <div className="flex gap-2"><input value={newTitle} onChange={(event) => setNewTitle(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && void addSchedule()} placeholder="이 날짜에 일정 추가..." className="min-w-0 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs focus:outline-none focus:border-primary" /><button onClick={() => void addSchedule()} disabled={saving || !newTitle.trim()} className="rounded-lg bg-primary px-3 text-white disabled:opacity-50" aria-label="일정 추가">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}</button></div>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>
    </div>
  );
}

function toDateString(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
