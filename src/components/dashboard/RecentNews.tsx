'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { Post } from '@/types/feed';
import { timeAgo } from '@/lib/utils';

interface RecentNewsProps {
  posts: Post[];
  villageId: string;
}

export function RecentNews({ posts, villageId }: RecentNewsProps) {
  return (
    <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-[var(--color-text)]">마을 소식</h3>
        <Link href={`/village/${villageId}/feed`} className="text-sm text-primary hover:underline">
          더 보기
        </Link>
      </div>
      <div className="space-y-3">
        {posts.slice(0, 3).map((post) => (
          <Link
            key={post.id}
            href={`/village/${villageId}/feed`}
            className="flex items-center justify-between group"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[var(--color-text)] truncate group-hover:text-primary transition-colors">
                {post.title}
              </p>
              <p className="text-xs text-[var(--color-text-secondary)]">{timeAgo(post.createdAt)}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0 ml-2" />
          </Link>
        ))}
        {posts.length === 0 && (
          <p className="text-sm text-[var(--color-text-secondary)] text-center py-4">
            아직 소식이 없습니다
          </p>
        )}
      </div>
    </div>
  );
}
