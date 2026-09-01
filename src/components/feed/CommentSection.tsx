'use client';

import { useEffect, useState } from 'react';
import { Send, Trash2, Loader2 } from 'lucide-react';
import { Avatar } from '@/components/common/Avatar';
import { useAuth } from '@/hooks/useAuth';
import { getComments, addComment, deleteComment } from '@/lib/firebase/firestore';
import { timeAgo } from '@/lib/utils';
import type { Comment } from '@/types/feed';

interface CommentSectionProps {
  villageId: string;
  postId: string;
  onCountChange?: (delta: number) => void;
}

export function CommentSection({ villageId, postId, onCountChange }: CommentSectionProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getComments(villageId, postId)
      .then((result) => { if (!cancelled) setComments(result); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [villageId, postId]);

  const handleSubmit = async () => {
    if (!user || !text.trim() || submitting) return;
    setSubmitting(true);
    try {
      const id = await addComment(villageId, postId, {
        authorId: user.uid,
        authorName: user.displayName,
        authorPhotoURL: user.photoURL,
        content: text.trim(),
      });
      setComments((prev) => [...prev, { id, authorId: user.uid, authorName: user.displayName, authorPhotoURL: user.photoURL, content: text.trim(), createdAt: new Date() }]);
      setText('');
      onCountChange?.(1);
    } catch { /* ignore */ }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('댓글을 삭제하시겠습니까?')) return;
    try {
      await deleteComment(villageId, postId, commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      onCountChange?.(-1);
    } catch { /* ignore */ }
  };

  return (
    <div className="border-t border-[var(--color-border)] pt-3 mt-3">
      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-4 h-4 animate-spin text-[var(--color-text-secondary)]" />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-xs text-[var(--color-text-secondary)] text-center py-3">아직 댓글이 없습니다</p>
      ) : (
        <div className="space-y-3 mb-3 max-h-60 overflow-y-auto">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-2 group">
              <Avatar src={comment.authorPhotoURL} name={comment.authorName} size={28} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[var(--color-text)]">{comment.authorName}</span>
                  <span className="text-[10px] text-[var(--color-text-secondary)]">{timeAgo(comment.createdAt)}</span>
                  {user?.uid === comment.authorId && (
                    <button onClick={() => handleDelete(comment.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-[var(--color-text-secondary)] hover:text-error">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <p className="text-sm text-[var(--color-text)]">{comment.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {user ? (
        <div className="flex items-center gap-2">
          <Avatar src={user.photoURL} name={user.displayName} size={28} />
          <div className="flex-1 flex items-center gap-2 bg-[var(--color-surface)] rounded-full px-3 py-1.5">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
              placeholder="댓글을 입력하세요..."
              className="flex-1 bg-transparent text-sm outline-none"
            />
            <button
              onClick={handleSubmit}
              disabled={!text.trim() || submitting}
              className="p-1 text-primary disabled:opacity-30 transition-opacity"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-[var(--color-text-secondary)] text-center py-2">댓글을 작성하려면 로그인하세요</p>
      )}
    </div>
  );
}
