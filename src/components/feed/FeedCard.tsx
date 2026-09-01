'use client';

import { useState } from 'react';
import { MoreVertical } from 'lucide-react';
import { Avatar } from '@/components/common/Avatar';
import { ImageGallery } from './ImageGallery';
import { FeedActions } from './FeedActions';
import { timeAgo } from '@/lib/utils';
import type { Post } from '@/types/feed';
import { useAuth } from '@/hooks/useAuth';
import { togglePostLike } from '@/lib/firebase/firestore';

interface FeedCardProps {
  post: Post;
}

export function FeedCard({ post }: FeedCardProps) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likeCount);

  const handleLike = async () => {
    if (!user) { window.location.href = '/login'; return; }
    try {
      const next = await togglePostLike(post.villageId, post.id, user.uid);
      setLiked(next); setLikeCount((count) => Math.max(0, count + (next ? 1 : -1)));
    } catch { /* demo data or permission errors leave the card unchanged */ }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/village/${post.villageId}/feed`;
    if (navigator.share) await navigator.share({ title: post.title, text: post.content, url });
    else await navigator.clipboard.writeText(url);
  };
  return (
    <article className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-card p-4 sm:p-5 transition-colors animate-fadeIn">
      {/* Author */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <Avatar src={post.authorPhotoURL} name={post.authorName} size={40} />
          <div>
            <p className="text-sm font-semibold text-[var(--color-text)]">{post.authorName}</p>
            <p className="text-xs text-[var(--color-text-secondary)]">{timeAgo(post.createdAt)}</p>
          </div>
        </div>
        <button className="p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text)]">
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <h3 className="text-base font-semibold text-[var(--color-text)] mb-1">{post.title}</h3>
      <p className="text-sm text-[var(--color-text-secondary)] mb-3 line-clamp-2">{post.content}</p>

      {/* Images */}
      <ImageGallery images={post.images} />

      {/* Actions */}
      <FeedActions likeCount={likeCount} commentCount={post.commentCount} liked={liked} onLike={handleLike} onShare={handleShare} />
    </article>
  );
}
