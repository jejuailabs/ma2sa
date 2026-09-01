'use client';

import { Upload } from 'lucide-react';

interface PhotoGridProps {
  photos: string[];
  onUpload?: () => void;
}

export function PhotoGrid({ photos, onUpload }: PhotoGridProps) {
  return (
    <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-[var(--color-text)]">최근 업로드 사진</h3>
        <button
          onClick={onUpload}
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          <Upload className="w-4 h-4" />
          업로드
        </button>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {photos.slice(0, 8).map((url, i) => (
          <div key={i} className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity">
            <img src={url} alt={`사진 ${i + 1}`} className="w-full h-full object-cover" />
          </div>
        ))}
      </div>
    </div>
  );
}
