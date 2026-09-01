'use client';

import { ImageIcon } from 'lucide-react';

interface ImageGalleryProps {
  images: string[];
}

export function ImageGallery({ images }: ImageGalleryProps) {
  if (images.length === 0) return null;

  if (images.length === 1) {
    return (
      <div className="rounded-xl overflow-hidden">
        <img src={images[0]} alt="" className="w-full h-48 sm:h-64 object-cover" />
      </div>
    );
  }

  if (images.length === 2) {
    return (
      <div className="grid grid-cols-2 gap-1 rounded-xl overflow-hidden">
        {images.map((img, i) => (
          <img key={i} src={img} alt="" className="w-full h-48 object-cover" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-5 gap-1 rounded-xl overflow-hidden h-48 sm:h-64">
      <div className="col-span-3">
        <img src={images[0]} alt="" className="w-full h-full object-cover" />
      </div>
      <div className="col-span-2 flex flex-col gap-1">
        <div className="flex-1 overflow-hidden">
          <img src={images[1]} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 overflow-hidden relative">
          <img src={images[2]} alt="" className="w-full h-full object-cover" />
          {images.length > 3 && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-1 text-white font-medium">
              <ImageIcon className="w-5 h-5" />
              <span>{images.length}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
