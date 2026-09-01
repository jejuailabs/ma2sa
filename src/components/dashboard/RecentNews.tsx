'use client';

import Link from 'next/link';
import { ChevronRight, Newspaper } from 'lucide-react';
import type { Post } from '@/types/feed';
import { timeAgo } from '@/lib/utils';

interface RecentNewsProps {
  posts: Post[];
  villageId: string;
}

const TYPE_LABELS: Record<string, string> = { news: '공지', event: '행사', product: '특산품' };

export function RecentNews({ posts, villageId }: RecentNewsProps) {
  return (
    <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-[var(--color-text)]">최근 마을 소식</h3>
        <Link href={`/village/${villageId}/feed`} className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)] hover:text-primary">
          전체보기 <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="space-y-1">
        {posts.slice(0, 5).map((post) => (
          <Link
            key={post.id}
            href={`/village/${villageId}/feed`}
            className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-[var(--color-surface)] transition-colors group"
          >
            <div className="w-8 h-8 rounded-lg bg-primary-light flex items-center justify-center shrink-0">
              <Newspaper className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--color-text)] truncate group-hover:text-primary transition-colors">
                {post.title}
              </p>
              <p className="text-[11px] text-[var(--color-text-secondary)]">
                {TYPE_LABELS[post.type] ?? post.type} · {timeAgo(post.createdAt)}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0" />
          </Link>
        ))}
        {posts.length === 0 && (
          <p className="text-sm text-[var(--color-text-secondary)] text-center py-6">아직 소식이 없습니다</p>
        )}
      </div>
    </div>
  );
}
