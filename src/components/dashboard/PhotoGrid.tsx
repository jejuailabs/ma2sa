'use client';

import { Camera } from 'lucide-react';

interface PhotoGridProps {
  photos: string[];
  onUpload?: () => void;
}

export function PhotoGrid({ photos, onUpload }: PhotoGridProps) {
  return (
    <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-[var(--color-text)]">최근 사진</h3>
        <button onClick={onUpload} className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)] hover:text-primary">
          <Camera className="w-3.5 h-3.5" /> 업로드
        </button>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {photos.slice(0, 8).map((url, i) => (
          <div key={i} className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity">
            <img src={url} alt={`사진 ${i + 1}`} className="w-full h-full object-cover" />
          </div>
        ))}
      </div>
    </div>
  );
}
