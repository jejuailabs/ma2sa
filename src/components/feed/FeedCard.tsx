'use client';

import { useEffect, useRef, useState } from 'react';
import { MoreVertical, Pencil, Trash2, X, Check } from 'lucide-react';
import { Avatar } from '@/components/common/Avatar';
import { ImageGallery } from './ImageGallery';
import { FeedActions } from './FeedActions';
import { CommentSection } from './CommentSection';
import { timeAgo } from '@/lib/utils';
import type { Post } from '@/types/feed';
import { useAuth } from '@/hooks/useAuth';
import { togglePostLike, updatePost, deletePost } from '@/lib/firebase/firestore';

interface FeedCardProps {
  post: Post;
  onPostUpdated?: () => void;
  onPostDeleted?: () => void;
}

export function FeedCard({ post, onPostUpdated, onPostDeleted }: FeedCardProps) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [showComments, setShowComments] = useState(false);

  // Kebab menu state
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Edit mode state
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(post.title);
  const [editContent, setEditContent] = useState(post.content);
  const [saving, setSaving] = useState(false);

  const isAuthor = user?.uid === post.authorId;

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

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

  const handleEdit = () => {
    setMenuOpen(false);
    setEditing(true);
    setEditTitle(post.title);
    setEditContent(post.content);
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim() || !editContent.trim()) return;
    setSaving(true);
    try {
      await updatePost(post.villageId, post.id, { title: editTitle.trim(), content: editContent.trim() });
      setEditing(false);
      onPostUpdated?.();
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setEditTitle(post.title);
    setEditContent(post.content);
  };

  const handleDelete = async () => {
    setMenuOpen(false);
    if (!confirm('이 게시물을 삭제하시겠습니까?')) return;
    try {
      await deletePost(post.villageId, post.id);
      onPostDeleted?.();
    } catch { /* ignore */ }
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

        {/* Kebab Menu */}
        {isAuthor && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-8 z-20 w-32 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg shadow-lg py-1 animate-fadeIn">
                <button
                  onClick={handleEdit}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" /> 수정
                </button>
                <button
                  onClick={handleDelete}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-error hover:bg-[var(--color-surface)] transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> 삭제
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content - edit mode or view mode */}
      {editing ? (
        <div className="mb-3 space-y-2">
          <input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="w-full px-3 py-2 text-base font-semibold rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] focus:outline-none focus:border-primary"
          />
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] resize-none focus:outline-none focus:border-primary"
          />
          <div className="flex justify-end gap-2">
            <button onClick={handleCancelEdit} disabled={saving} className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]">
              <X className="w-3.5 h-3.5" /> 취소
            </button>
            <button onClick={handleSaveEdit} disabled={saving || !editTitle.trim() || !editContent.trim()} className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg bg-primary text-white disabled:opacity-50">
              <Check className="w-3.5 h-3.5" /> {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      ) : (
        <>
          <h3 className="text-base font-semibold text-[var(--color-text)] mb-1">{post.title}</h3>
          <p className="text-sm text-[var(--color-text-secondary)] mb-3 line-clamp-2">{post.content}</p>
        </>
      )}

      {/* Images */}
      <ImageGallery images={post.images} />

      {/* Actions */}
      <FeedActions
        likeCount={likeCount}
        commentCount={commentCount}
        liked={liked}
        onLike={handleLike}
        onComment={() => setShowComments(!showComments)}
        onShare={handleShare}
      />

      {/* Comments */}
      {showComments && (
        <CommentSection
          villageId={post.villageId}
          postId={post.id}
          onCountChange={(delta) => setCommentCount((c) => Math.max(0, c + delta))}
        />
      )}
    </article>
  );
}
