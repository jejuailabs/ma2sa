'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { isFirebaseConfigured, db } from '@/lib/firebase/config';
import { collection, query, getDocs } from 'firebase/firestore';
import { subscribeTodos } from '@/lib/firebase/firestore';
import type { Todo } from '@/types/feed';

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: string;
}

const TYPE_DOT: Record<string, string> = {
  meeting: 'bg-blue-500',
  event: 'bg-green-500',
  deadline: 'bg-red-500',
  other: 'bg-gray-400',
};

interface MiniCalendarProps {
  villageId: string;
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

export function MiniCalendar({ villageId, selectedDate, onSelectDate }: MiniCalendarProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);

  useEffect(() => {
    if (!isFirebaseConfigured || !db) return;
    getDocs(query(collection(db, 'villages', villageId, 'schedule')))
      .then((snap) => {
        setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() } as CalendarEvent)));
      })
      .catch(() => {});
  }, [villageId]);

  useEffect(() => subscribeTodos(villageId, setTodos), [villageId]);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else setMonth(month - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else setMonth(month + 1);
  };

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  const getDateStr = (day: number) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const eventsForDate = (dateStr: string) => events.filter((e) => e.date === dateStr);
  const todosForDate = (dateStr: string) => todos.filter((todo) => todoDate(todo, todayStr) === dateStr);
  const selectedEvents = selectedDate ? eventsForDate(selectedDate) : [];
  const selectedTodos = selectedDate ? todosForDate(selectedDate) : [];

  return (
    <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-[var(--color-text)]">일정</h3>
        <Link href={`/village/${villageId}/schedule`} className="text-xs text-primary font-medium">관리 &rsaquo;</Link>
      </div>

      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth} className="p-1 rounded hover:bg-[var(--color-surface)]">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-bold">{year}년 {month + 1}월</span>
        <button onClick={nextMonth} className="p-1 rounded hover:bg-[var(--color-surface)]">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0 text-center mb-1">
        {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
          <div key={d} className={`text-[10px] font-medium py-1 ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-[var(--color-text-secondary)]'}`}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0">
        {days.map((day, i) => {
          if (day === null) return <div key={`e-${i}`} />;
          const dateStr = getDateStr(day);
          const isToday = dateStr === todayStr;
          const dayEvents = eventsForDate(dateStr);
          const dayTodos = todosForDate(dateStr);
          const isSelected = dateStr === selectedDate;
          const dayOfWeek = new Date(year, month, day).getDay();

          return (
            <button
              key={day}
              onClick={() => onSelectDate(isSelected ? todayStr : dateStr)}
              className={`relative flex flex-col items-center py-1.5 rounded-lg text-xs transition-colors
                ${isToday ? 'bg-primary text-white font-bold' : ''}
                ${isSelected && !isToday ? 'bg-primary-light ring-1 ring-primary' : ''}
                ${dayTodos.length > 0 && !isToday && !isSelected ? 'bg-secondary-light text-secondary font-bold' : ''}
                ${!isToday && !isSelected ? 'hover:bg-[var(--color-surface)]' : ''}
                ${dayOfWeek === 0 && !isToday ? 'text-red-400' : ''}
                ${dayOfWeek === 6 && !isToday ? 'text-blue-400' : ''}
              `}
            >
              {day}
              {dayEvents.length > 0 && (
                <div className="flex gap-0.5 mt-0.5">
                  {dayEvents.slice(0, 3).map((e) => (
                    <div key={e.id} className={`w-1 h-1 rounded-full ${isToday ? 'bg-white' : TYPE_DOT[e.type] || TYPE_DOT.other}`} />
                  ))}
                </div>
              )}
              {dayTodos.length > 0 && dayEvents.length === 0 && (
                <span className={`mt-0.5 h-1 w-1 rounded-full ${isToday ? 'bg-white' : 'bg-secondary'}`} />
              )}
            </button>
          );
        })}
      </div>

      {(selectedEvents.length > 0 || selectedTodos.length > 0) && (
        <div className="mt-3 pt-3 border-t border-[var(--color-border)] space-y-1.5">
          {selectedEvents.map((e) => (
            <div key={e.id} className="flex items-center gap-2 text-xs">
              <div className={`w-2 h-2 rounded-full shrink-0 ${TYPE_DOT[e.type] || TYPE_DOT.other}`} />
              <span className="truncate">{e.title}</span>
            </div>
          ))}
          {selectedTodos.map((todo) => (
            <div key={todo.id} className="flex items-center gap-2 text-xs">
              <div className="w-2 h-2 rounded-full shrink-0 bg-secondary" />
              <span className={todo.completed ? 'truncate line-through text-[var(--color-text-secondary)]' : 'truncate'}>{todo.title}</span>
            </div>
          ))}
        </div>
      )}

      {selectedDate && selectedEvents.length === 0 && selectedTodos.length === 0 && (
        <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
          <p className="text-xs text-[var(--color-text-secondary)] text-center">이 날 일정이 없습니다</p>
        </div>
      )}
    </div>
  );
}

function todoDate(todo: Todo, fallback: string) {
  if (!todo.dueDate) return fallback;
  return `${todo.dueDate.getFullYear()}-${String(todo.dueDate.getMonth() + 1).padStart(2, '0')}-${String(todo.dueDate.getDate()).padStart(2, '0')}`;
}
