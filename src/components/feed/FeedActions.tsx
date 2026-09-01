'use client';

import { Heart, MessageCircle, Share2 } from 'lucide-react';
import { formatCount } from '@/lib/utils';

interface FeedActionsProps {
  likeCount: number;
  commentCount: number;
  liked?: boolean;
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
}

export function FeedActions({ likeCount, commentCount, liked, onLike, onComment, onShare }: FeedActionsProps) {
  return (
    <div className="flex items-center justify-between pt-3">
      <div className="flex items-center gap-5">
        <button onClick={onLike} className="flex items-center gap-1.5 text-[var(--color-text-secondary)] hover:text-primary transition-colors">
          <Heart className={`w-5 h-5 ${liked ? 'fill-primary text-primary' : ''}`} />
          <span className="text-sm">{formatCount(likeCount)}</span>
        </button>
        <button onClick={onComment} className="flex items-center gap-1.5 text-[var(--color-text-secondary)] hover:text-primary transition-colors">
          <MessageCircle className="w-5 h-5" />
          <span className="text-sm">{formatCount(commentCount)}</span>
        </button>
      </div>
      <button onClick={onShare} className="flex items-center gap-1.5 text-[var(--color-text-secondary)] hover:text-primary transition-colors">
        <Share2 className="w-5 h-5" />
        <span className="text-sm">공유</span>
      </button>
    </div>
  );
}
