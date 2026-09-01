'use client';

import { useState } from 'react';
import { ImagePlus, Loader2, Plus, X, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { createPost } from '@/lib/firebase/firestore';
import { uploadFile } from '@/lib/firebase/storage';
import type { PostType } from '@/types/feed';

export function PostComposer({ villageId, villageName, onCreated, defaultType = 'news' }: { villageId: string; villageName: string; onCreated: () => void; defaultType?: PostType }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!user) return null;

  const addFiles = (newFiles: File[]) => {
    const all = [...files, ...newFiles].slice(0, 15);
    setFiles(all);
    const newPreviews: string[] = [...previews];
    newFiles.forEach((f) => {
      const reader = new FileReader();
      reader.onload = () => {
        newPreviews.push(reader.result as string);
        setPreviews([...newPreviews]);
      };
      reader.readAsDataURL(f);
    });
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
    setPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const submit = async () => {
    if (!title.trim() || !content.trim()) { setError('제목과 내용을 입력해주세요.'); return; }
    setBusy(true); setError('');
    try {
      const images = await Promise.all(files.slice(0, 15).map((file) => uploadFile(`villages/${villageId}/photos/${user.uid}/${crypto.randomUUID()}-${file.name}`, file)));
      await createPost(villageId, { villageName, authorId: user.uid, authorName: user.displayName, authorPhotoURL: user.photoURL, type: defaultType, title: title.trim(), content: content.trim(), images, isPublic, tags: [] });
      setTitle(''); setContent(''); setFiles([]); setPreviews([]); setOpen(false); onCreated();
    } catch (cause) { setError(cause instanceof Error ? cause.message : '게시하지 못했습니다.'); }
    finally { setBusy(false); }
  };

  if (!open) return <button onClick={() => setOpen(true)} className="mb-5 flex items-center gap-2 px-4 py-2.5 rounded-button bg-primary text-white"><Plus className="w-4 h-4" />새 소식 작성</button>;
  return (
    <div className="mb-6 p-5 rounded-card border border-[var(--color-border)] bg-[var(--color-bg)]">
      <div className="flex items-center justify-between mb-4"><h2 className="font-semibold">새 소식 작성</h2><button onClick={() => setOpen(false)}><X className="w-5 h-5" /></button></div>
      {error && <p className="mb-3 text-sm text-error">{error}</p>}
      <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="제목" className="w-full px-4 py-3 mb-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] focus:outline-none focus:border-primary" />
      <textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder="마을 이야기를 적어주세요" rows={5} className="w-full px-4 py-3 mb-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] resize-none focus:outline-none focus:border-primary" />

      {previews.length > 0 && (
        <div className="grid grid-cols-4 gap-2 mb-3">
          {previews.map((src, i) => (
            <div key={i} className="relative aspect-square rounded-lg overflow-hidden group">
              <img src={src} alt="" className="w-full h-full object-cover" />
              <button onClick={() => removeFile(i)} className="absolute top-1 right-1 p-1 rounded bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3 h-3" /></button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm cursor-pointer hover:border-primary"><ImagePlus className="w-4 h-4" />사진 추가<input type="file" accept="image/*" multiple className="hidden" onChange={(event) => { addFiles(Array.from(event.target.files ?? [])); event.target.value = ''; }} /></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={isPublic} onChange={(event) => setIsPublic(event.target.checked)} />공개 글</label>
        <button onClick={submit} disabled={busy} className="ml-auto px-5 py-2 rounded-lg bg-primary text-white disabled:opacity-50">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : '게시'}</button>
      </div>
    </div>
  );
}
