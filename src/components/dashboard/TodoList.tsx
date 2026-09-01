'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Todo } from '@/types/feed';
import { addTodo as addTodoRemote, deleteTodo as deleteTodoRemote, subscribeTodos, toggleTodo as toggleTodoRemote } from '@/lib/firebase/firestore';
import { isFirebaseConfigured } from '@/lib/firebase/config';

interface TodoListProps {
  initialTodos: Todo[];
  villageId?: string;
  userId?: string;
  selectedDate: string;
}

export function TodoList({ initialTodos, villageId, userId, selectedDate }: TodoListProps) {
  const [todos, setTodos] = useState<Todo[]>(initialTodos);
  const [newTodoTitle, setNewTodoTitle] = useState('');

  useEffect(() => {
    if (!villageId || !isFirebaseConfigured) return;
    return subscribeTodos(villageId, setTodos);
  }, [villageId]);

  const toggleTodo = async (id: string) => {
    const current = todos.find((item) => item.id === id);
    if (!current) return;
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
    if (villageId && isFirebaseConfigured) await toggleTodoRemote(villageId, id, !current.completed);
  };

  const addTodo = async () => {
    if (!newTodoTitle.trim()) return;
    const todo: Todo = {
      id: 'new_' + Date.now(),
      title: newTodoTitle.trim(),
      completed: false,
      assignedTo: '',
      createdBy: '',
      createdAt: new Date(),
      dueDate: new Date(`${selectedDate}T00:00:00`),
    };
    setTodos((prev) => [...prev, todo]);
    setNewTodoTitle('');
    if (villageId && userId && isFirebaseConfigured) await addTodoRemote(villageId, todo.title, userId, todo.dueDate);
  };

  const removeTodo = async (id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    if (villageId && isFirebaseConfigured) await deleteTodoRemote(villageId, id);
  };

  const visibleTodos = todos.filter((todo) => todoDate(todo) === selectedDate);
  const selectedDateLabel = new Date(`${selectedDate}T00:00:00`).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });

  return (
    <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-card p-5">
      <h3 className="font-semibold text-[var(--color-text)] mb-1">{selectedDateLabel} 할 일</h3>
      <p className="mb-4 text-xs text-[var(--color-text-secondary)]">달력에서 선택한 날짜에 할 일을 추가합니다.</p>

      <div className="space-y-2 mb-4">
        {visibleTodos.length === 0 && (
          <p className="text-sm text-[var(--color-text-secondary)] py-4 text-center">
            할 일을 추가해보세요
          </p>
        )}
        {visibleTodos.map((todo) => (
          <div key={todo.id} className="flex items-center gap-3 group">
            <button
              onClick={() => void toggleTodo(todo.id)}
              className={cn(
                'w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
                todo.completed
                  ? 'bg-secondary border-secondary'
                  : 'border-[var(--color-border)] hover:border-secondary'
              )}
            >
              {todo.completed && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
            <span
              className={cn(
                'flex-1 text-sm',
                todo.completed
                  ? 'line-through text-[var(--color-text-secondary)]'
                  : 'text-[var(--color-text)]'
              )}
            >
              {todo.title}
            </span>
            <button
              onClick={() => void removeTodo(todo.id)}
              className="opacity-0 group-hover:opacity-100 text-[var(--color-text-secondary)] hover:text-error transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Add todo */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newTodoTitle}
          onChange={(e) => setNewTodoTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void addTodo()}
          placeholder={`${selectedDateLabel} 할 일 추가...`}
          className="flex-1 px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:border-secondary"
        />
        <button
          onClick={() => void addTodo()}
          className="px-3 py-2 bg-secondary text-white rounded-lg hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function todoDate(todo: Todo) {
  const date = todo.dueDate || new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
